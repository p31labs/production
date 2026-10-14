// cbs-verify.mjs — LOVE settlement verification for the p31-mcp-bridge
// (Node service, L3.4). The bridge is the MERCHANT side of the two-challenge
// Clause Blind Schnorr settlement (docs/specs/love-settlement-cbs.md §6):
//
//   1. LOCAL verify of BOTH challenges against the ledger's public X
//      (fetched from GET /blind-pubkey, cached ~5 min).
//   2. POST /verify-settlement on the ledger to consume the single-use
//      nonce + coin and debit the balance (idempotent replay rejection).
//
// Dispatch is allowed only if BOTH pass. Verification runs only when the
// X-LOVE-Signature header is present (x402-paid and free-tool paths carry
// no signature and are unchanged).
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const crypto = webcrypto;
const LEDGER_URL = process.env.LOVE_LEDGER_URL || 'https://love-ledger.p31ca.org';
const X_CACHE_TTL_MS = 5 * 60 * 1000;

// ── WASM (same artifact the ledger signs with) ─────────────────────────
const WASM_PATH = new URL('../taler-cbs/taler_cs.wasm', import.meta.url);
const wasmBytes = readFileSync(WASM_PATH);
let wasmReady = null;
let ex = null;
let mem = null;
const P = 32;
let BASE = 0;
let OFF = {};

async function ensureWasm() {
  if (wasmReady) return wasmReady;
  wasmReady = (async () => {
    const { instance } = await WebAssembly.instantiate(wasmBytes, { env: {} });
    ex = instance.exports;
    mem = ex.memory;
    BASE = Math.ceil(ex.__heap_base.value / 1024) * 1024;
    OFF = {
      msg: BASE + 0,
      a0: BASE + 2048, a1: BASE + 3072,
      b0: BASE + 4096, b1: BASE + 5120,
      r0: BASE + 6144, r1: BASE + 7168,
      x: BASE + 8192,
      rp0: BASE + 9216, rp1: BASE + 9248,
      c0: BASE + 9280, c1: BASE + 9312,
      cp0: BASE + 9344, cp1: BASE + 9376,
      s0: BASE + 12288, s1: BASE + 12320,
    };
  })();
  return wasmReady;
}

function wr(off, d) {
  while (mem.buffer.byteLength < off + d.length) mem.grow(1);
  new Uint8Array(mem.buffer, off, d.length).set(d);
}

function verifyCbs(msg, cp0, sp0, cp1, sp1, X, rp0, rp1) {
  wr(OFF.msg, msg);
  wr(OFF.a0, cp0); wr(OFF.a1, sp0);
  wr(OFF.b0, cp1); wr(OFF.b1, sp1);
  wr(OFF.x, X);
  wr(OFF.r0, rp0); wr(OFF.r1, rp1);
  return ex.cs_verify(OFF.msg, msg.length, OFF.a0, OFF.a1, OFF.b0, OFF.b1, OFF.x, OFF.r0, OFF.r1) === 0;
}

const b64d = (s) => new Uint8Array(Buffer.from(s, 'base64'));

// ── Ledger public key cache ────────────────────────────────────────────
let cachedX = null;
let cachedAt = 0;

async function ledgerPublicKey() {
  if (cachedX && Date.now() - cachedAt < X_CACHE_TTL_MS) return cachedX;
  const res = await fetch(`${LEDGER_URL}/blind-pubkey`);
  if (!res.ok) throw new Error(`blind-pubkey ${res.status}`);
  const pk = await res.json();
  if (!pk.X) throw new Error('blind-pubkey missing X');
  cachedX = b64d(pk.X);
  cachedAt = Date.now();
  return cachedX;
}

/**
 * Verify a LOVE settlement presented on POST /mcp.
 * @param did   X-DID header value
 * @param settlementB64  X-LOVE-Settlement header (b64 canonical JSON)
 * @param signatureB64   X-LOVE-Signature header (b64 JSON {r0,r1,s0,s1,c0,c1,t})
 * @returns { ok: boolean, reason?: string }
 */
export async function verifyLoveSettlement(did, settlementB64, signatureB64) {
  if (!settlementB64 || !signatureB64) return { ok: false, reason: 'missing-headers' };
  let sig;
  try {
    sig = JSON.parse(Buffer.from(signatureB64, 'base64').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed-signature' };
  }
  for (const k of ['r0', 'r1', 's0', 's1', 'c0', 'c1', 't']) {
    if (typeof sig[k] !== 'string') return { ok: false, reason: 'malformed-signature' };
  }
  let m;
  let mText;
  try {
    mText = Buffer.from(settlementB64, 'base64').toString('utf8');
    m = JSON.parse(mText);
  } catch {
    return { ok: false, reason: 'malformed-message' };
  }
  if (m.did !== did) return { ok: false, reason: 'did-mismatch' };

  try {
    await ensureWasm();
    const X = await ledgerPublicKey();
    const msg = new TextEncoder().encode(mText);
    const localOk = verifyCbs(
      msg,
      b64d(sig.c0), b64d(sig.s0),
      b64d(sig.c1), b64d(sig.s1),
      X,
      b64d(sig.r0), b64d(sig.r1),
    );
    if (!localOk) return { ok: false, reason: 'signature' };
  } catch (e) {
    return { ok: false, reason: `ledger-unreachable:${e.message}` };
  }

  // Nonce + coin consumption (single-use; idempotent rejection on replay).
  try {
    const res = await fetch(`${LEDGER_URL}/verify-settlement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did, msg: settlementB64, sig }),
    });
    const verdict = await res.json().catch(() => ({}));
    if (res.ok && verdict.valid === true) return { ok: true };
    return { ok: false, reason: verdict.reason || `verify-settlement-${res.status}` };
  } catch (e) {
    return { ok: false, reason: `ledger-unreachable:${e.message}` };
  }
}