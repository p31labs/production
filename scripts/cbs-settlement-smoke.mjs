// cbs-settlement-smoke.mjs — end-to-end LOVE settlement smoke test.
//
// Legs (any failure → non-zero exit):
//   A. Ledger: /health + /blind-pubkey freshness + /blind-sign replay 409.
//   B. Bridge enforcement: a REAL two-challenge issuance (client flow vs the
//      ledger) settles through the bridge → 200; replay of the SAME
//      signature → 403 nonce-consumed; tampered signature → 403.
//   C. Gateway (when LOVE_AUTH_SECRET is set — the gateway requires the
//      shared HMAC): /health, then a PAID tool call with valid HMAC headers
//      settles end-to-end (gateway mints the blind signature, bridge
//      verifies + consumes). A bad HMAC must still get 401.
//
// Env:
//   LOVE_AUTH_SECRET   hex or utf8 shared secret (required for leg C;
//                      leg C is skipped when unset).
//   SMOKE_DID          DID with balance in love_accounts (default did:smoke:cbs)
//   LOVE_LEDGER_URL    (default https://love-ledger.p31ca.org)
//   LOVE_BRIDGE_URL    (default https://mcp-x402-bridge.p31ca.org)
//   LOVE_GATEWAY_URL   (default https://mcp-x402-gateway.trimtab-signal.workers.dev)
//
// Seeding a smoke DID (once):
//   cd workers/love-ledger && npx wrangler d1 execute love-ledger --remote \
//     --command "INSERT INTO love_accounts (did, balance) VALUES ('did:smoke:cbs', 100)
//                ON CONFLICT(did) DO UPDATE SET balance = 100"

import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const crypto = webcrypto;
const LEDGER = process.env.LOVE_LEDGER_URL || 'https://love-ledger.p31ca.org';
const BRIDGE = process.env.LOVE_BRIDGE_URL || 'https://mcp-x402-bridge.p31ca.org';
const GATEWAY = process.env.LOVE_GATEWAY_URL || 'https://mcp-x402-gateway.trimtab-signal.workers.dev';
const DID = process.env.SMOKE_DID || 'did:smoke:cbs';
const AUTH_SECRET = process.env.LOVE_AUTH_SECRET || '';

const WASM = new URL('../workers/creation-accountant/src/taler_cs.wasm', import.meta.url);
const buf = readFileSync(WASM);
const { instance } = await WebAssembly.instantiate(buf, { env: {} });
const EX = instance.exports;
const MEM = EX.memory;
const P = 32;
const BASE = Math.ceil(EX.__heap_base.value / 1024) * 1024;
const ensure = (o, n) => { while (MEM.buffer.byteLength < o + n) MEM.grow(1); };
const wr = (o, d) => { ensure(o, d.length); new Uint8Array(MEM.buffer, o, d.length).set(d); };
const rd = (o, n) => { ensure(o, n); return new Uint8Array(MEM.buffer, o, n).slice(); };
const OFF_A0 = () => BASE + 0, OFF_A1 = () => BASE + P, OFF_B0 = () => BASE + 2 * P, OFF_B1 = () => BASE + 3 * P,
  OFF_R0 = () => BASE + 4 * P, OFF_R1 = () => BASE + 5 * P, OFF_X = () => BASE + 6 * P,
  OFF_RP0 = () => BASE + 7 * P, OFF_RP1 = () => OFF_RP0() + P, OFF_C0 = () => OFF_RP1() + P,
  OFF_C1 = () => OFF_C0() + P, OFF_CP0 = () => OFF_C1() + P, OFF_CP1 = () => OFF_CP0() + P,
  OFF_S0 = () => BASE + 14 * P, OFF_S1 = () => OFF_S0() + P, OFF_BUF = () => BASE + 16 * P;

function blind(msg, a0, a1, b0, b1, R0, R1, X) {
  const m = OFF_BUF() + P; wr(m, msg);
  wr(OFF_A0(), a0); wr(OFF_A1(), a1); wr(OFF_B0(), b0); wr(OFF_B1(), b1);
  wr(OFF_R0(), R0); wr(OFF_R1(), R1); wr(OFF_X(), X);
  if (EX.cs_blind(m, msg.length, OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_R0(), OFF_R1(), OFF_X(),
    OFF_RP0(), OFF_RP1(), OFF_C0(), OFF_C1(), OFF_CP0(), OFF_CP1()) !== 0) throw new Error('blind fail');
  return {
    rp0: rd(OFF_RP0(), P), rp1: rd(OFF_RP1(), P),
    c0: rd(OFF_C0(), P), c1: rd(OFF_C1(), P),
    cp0: rd(OFF_CP0(), P), cp1: rd(OFF_CP1(), P),
  };
}
function unblind(s0, s1, a0, a1) {
  wr(OFF_A0(), s0); wr(OFF_A1(), s1); wr(OFF_B0(), a0); wr(OFF_B1(), a1);
  if (EX.cs_unblind(OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_S0(), OFF_S1()) !== 0) throw new Error('unblind fail');
  return { sp0: rd(OFF_S0(), P), sp1: rd(OFF_S1(), P) };
}
const b64e = (u) => Buffer.from(u).toString('base64');
const b64d = (s) => new Uint8Array(Buffer.from(s, 'base64'));
const rnd = () => crypto.getRandomValues(new Uint8Array(32));
const j = (r) => r.json();
let failures = 0;
const check = (label, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
};

// Client half of one settlement issuance (spec §5).
async function issueSettlement(tool, amount) {
  const pk = await j(await fetch(`${LEDGER}/blind-pubkey`));
  const m = JSON.stringify({ version: '1', did: DID, tool, amount, t: pk.t });
  const mBytes = new TextEncoder().encode(m);
  const a0 = rnd(), a1 = rnd(), b0 = rnd(), b1 = rnd();
  const bl = blind(mBytes, a0, a1, b0, b1, b64d(pk.R0), b64d(pk.R1), b64d(pk.X));
  const sRes = await j(await fetch(`${LEDGER}/blind-sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ c0: b64e(bl.c0), c1: b64e(bl.c1), t: pk.t }),
  }));
  const { sp0, sp1 } = unblind(b64d(sRes.s0), b64d(sRes.s1), a0, a1);
  const sig = {
    r0: b64e(bl.rp0), r1: b64e(bl.rp1),
    s0: b64e(sp0), s1: b64e(sp1),
    c0: b64e(bl.cp0), c1: b64e(bl.cp1),
    t: pk.t,
  };
  return {
    signatureB64: Buffer.from(JSON.stringify(sig)).toString('base64'),
    settlementB64: Buffer.from(m).toString('base64'),
  };
}

// ── Leg A: ledger ──────────────────────────────────────────────────────
const health = await fetch(`${LEDGER}/health`);
check('A1 ledger /health 200', health.status === 200, `HTTP ${health.status}`);

const pk1 = await j(await fetch(`${LEDGER}/blind-pubkey`));
const pk2 = await j(await fetch(`${LEDGER}/blind-pubkey`));
check('A2 /blind-pubkey shape', !!pk1.X && !!pk1.R0 && !!pk1.R1 && !!pk1.t);
check('A3 fresh t per call', pk1.t !== pk2.t);

const repl = await j(await fetch(`${LEDGER}/blind-sign`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ c0: b64e(rnd()), c1: b64e(rnd()), t: pk1.t }),
}));
// pk1.t was never signed with → first sign succeeds; a second sign of the
// same t must then 409.
if (!repl.error) {
  const repl2 = await j(await fetch(`${LEDGER}/blind-sign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ c0: b64e(rnd()), c1: b64e(rnd()), t: pk1.t }),
  }));
  check('A4 replayed t rejected at /blind-sign', !!repl2.error, repl2.error || 'ACCEPTED');
} else {
  check('A4 replayed t rejected at /blind-sign', false, 'first sign unexpected: ' + JSON.stringify(repl));
}

// ── Leg B: bridge enforcement with a real issuance ────────────────────
const iss = await issueSettlement('cbs-smoke-bridge', '1');
const mcp = JSON.stringify({ jsonrpc: '2.0', id: 77, method: 'initialize', params: {} });
const okRes = await fetch(`${BRIDGE}/mcp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-LOVE-Signature': iss.signatureB64,
    'X-LOVE-Settlement': iss.settlementB64,
    'X-DID': DID,
  },
  body: mcp,
});
const okBody = await okRes.json().catch(() => ({}));
check('B1 bridge dispatches with valid settlement', okRes.status === 200, `HTTP ${okRes.status}`);

const replayRes = await fetch(`${BRIDGE}/mcp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-LOVE-Signature': iss.signatureB64,
    'X-LOVE-Settlement': iss.settlementB64,
    'X-DID': DID,
  },
  body: mcp,
});
const replayBody = await replayRes.json().catch(() => ({}));
check('B2 replay of same settlement → 403', replayRes.status === 403, `HTTP ${replayRes.status} ${replayBody?.error?.message ?? ''}`);

const tamperedSig = JSON.parse(Buffer.from(iss.signatureB64, 'base64').toString('utf8'));
tamperedSig.s0 = b64e(rnd());
const tamperRes = await fetch(`${BRIDGE}/mcp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-LOVE-Signature': Buffer.from(JSON.stringify(tamperedSig)).toString('base64'),
    'X-LOVE-Settlement': iss.settlementB64,
    'X-DID': DID,
  },
  body: mcp,
});
check('B3 tampered signature → 403', tamperRes.status === 403, `HTTP ${tamperRes.status}`);

// ── Leg C: full gateway path (requires the shared HMAC secret) ────────
if (!AUTH_SECRET) {
  console.log('SKIP  Leg C (gateway) — LOVE_AUTH_SECRET not set; bridge+ledger legs above ran.');
} else {
  const gHealth = await fetch(`${GATEWAY}/health`);
  check('C1 gateway /health 200', gHealth.status === 200, `HTTP ${gHealth.status}`);

  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const ts = Date.now();
  const mac = Buffer.from(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`love:${ts}`))).toString('hex');

  // Paid (read-only) tool: truth_verify_baseline @ $0.01.
  const call = JSON.stringify({
    jsonrpc: '2.0', id: 88, method: 'tools/call',
    params: { name: 'truth_verify_baseline', arguments: {} },
  });
  const gwRes = await fetch(`${GATEWAY}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Creation-Unit': 'love',
      'X-DID': DID,
      'X-Love-Auth-MAC': mac,
      'X-Love-Timestamp': String(ts),
    },
    body: call,
  });
  const gwBody = await gwRes.json().catch(() => ({}));
  check('C2 gateway settles a paid LOVE tool call', gwRes.status === 200, `HTTP ${gwRes.status} ${JSON.stringify(gwBody).slice(0, 140)}`);

  const badRes = await fetch(`${GATEWAY}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Creation-Unit': 'love',
      'X-DID': DID,
      'X-Love-Auth-MAC': 'deadbeef',
      'X-Love-Timestamp': String(ts),
    },
    body: call,
  });
  check('C3 bad HMAC still rejected → 401', badRes.status === 401, `HTTP ${badRes.status}`);
}

console.log(failures === 0 ? '\nCBS SETTLEMENT SMOKE: PASS' : `\nCBS SETTLEMENT SMOKE: FAIL (${failures})`);
process.exit(failures === 0 ? 0 : 1);