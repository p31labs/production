// cbs-verify.test.mjs — bridge LOVE settlement verification tests.
//
// Builds a LOCAL two-challenge CBS issuer (same wasm the ledger signs
// with), mocks the ledger HTTP surface (blind-pubkey / verify-settlement),
// and drives the REAL bridge verification path:
//   1. valid captured signature -> ok
//   2. tampered signature        -> ok:false 'signature'
//   3. replay (ledger says nonce-consumed) -> ok:false 'nonce-consumed'
//   4. DID mismatch              -> ok:false 'did-mismatch'
//   5. malformed headers         -> ok:false
//   6. HTTP layer: POST /mcp with valid sig -> 200 dispatch,
//      tampered sig -> 403, no sig -> 200 (unchanged paths).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';
import { verifyLoveSettlement } from '../cbs-verify.mjs';
import { createServer } from '../index.mjs';

const crypto = webcrypto;

// ── Local issuer harness (mirrors taler-cbs/kdf.ts) ────────────────────
const wasmBytes = readFileSync(new URL('../../taler-cbs/taler_cs.wasm', import.meta.url));
const { instance } = await WebAssembly.instantiate(wasmBytes, { env: {} });
const WEX = instance.exports;
const WMEM = WEX.memory;
const WBASE = Math.ceil(WEX.__heap_base.value / 1024) * 1024;
const wr = (o, d) => { new Uint8Array(WMEM.buffer, o, d.length).set(d); };
const rd = (o, n) => new Uint8Array(WMEM.buffer, o, n).slice();
const P = 32;

const wBase = (x) => { wr(WBASE, x); if (WEX.cs_base(WBASE, WBASE + 2048) !== 0) throw new Error('base'); return rd(WBASE + 2048, P); };
const wBlind = (msg, a0, a1, b0, b1, R0, R1, X) => {
  wr(WBASE + 4096, msg);
  wr(WBASE + 6144, a0); wr(WBASE + 6176, a1); wr(WBASE + 6208, b0); wr(WBASE + 6240, b1);
  wr(WBASE + 6272, R0); wr(WBASE + 6304, R1); wr(WBASE + 6336, X);
  if (WEX.cs_blind(WBASE + 4096, msg.length, WBASE + 6144, WBASE + 6176, WBASE + 6208, WBASE + 6240,
    WBASE + 6272, WBASE + 6304, WBASE + 6336,
    WBASE + 6368, WBASE + 6400, WBASE + 6432, WBASE + 6464, WBASE + 6496, WBASE + 6528) !== 0) throw new Error('blind');
  return {
    rp0: rd(WBASE + 6368, P), rp1: rd(WBASE + 6400, P),
    c0: rd(WBASE + 6432, P), c1: rd(WBASE + 6464, P),
    cp0: rd(WBASE + 6496, P), cp1: rd(WBASE + 6528, P),
  };
};
const wSign = (c0, c1, n0, n1, x) => {
  wr(WBASE + 6144, c0); wr(WBASE + 6176, c1); wr(WBASE + 6208, n0); wr(WBASE + 6240, n1); wr(WBASE + 6272, x);
  if (WEX.cs_sign_blinded(WBASE + 6144, WBASE + 6176, WBASE + 6208, WBASE + 6240, WBASE + 6272, WBASE + 6304, WBASE + 6336) !== 0) throw new Error('sign');
  return { s0: rd(WBASE + 6304, P), s1: rd(WBASE + 6336, P) };
};
const wUnblind = (s0, s1, a0, a1) => {
  wr(WBASE + 6144, s0); wr(WBASE + 6176, s1); wr(WBASE + 6208, a0); wr(WBASE + 6240, a1);
  if (WEX.cs_unblind(WBASE + 6144, WBASE + 6176, WBASE + 6208, WBASE + 6240, WBASE + 6304, WBASE + 6336) !== 0) throw new Error('unblind');
  return { sp0: rd(WBASE + 6304, P), sp1: rd(WBASE + 6336, P) };
};
const deriveNonce = async (domain, x, t) => {
  const dom = new TextEncoder().encode(domain);
  const input = new Uint8Array(dom.length + x.length + t.length);
  input.set(dom, 0); input.set(x, dom.length); input.set(t, dom.length + x.length);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-512', input));
  h[0] &= 248; h[31] &= 127; h[31] |= 64;
  return h.slice(0, 32);
};
const b64e = (u) => Buffer.from(u).toString('base64');

// ── One local issuer + one withdrawal's worth of issuance ──────────────
const x = crypto.getRandomValues(new Uint8Array(32));
const X = wBase(x);
const t = crypto.getRandomValues(new Uint8Array(32));
const n0 = await deriveNonce('cbs-n0', x, t);
const n1 = await deriveNonce('cbs-n1', x, t);
const R0 = wBase(n0);
const R1 = wBase(n1);

const DID = 'did:test:bridge-verify';
const m = JSON.stringify({ version: '1', did: DID, tool: 'oasis_execute', amount: '0.05', t: b64e(t) });
const mBytes = new TextEncoder().encode(m);
const a0 = crypto.getRandomValues(new Uint8Array(32));
const a1 = crypto.getRandomValues(new Uint8Array(32));
const b0 = crypto.getRandomValues(new Uint8Array(32));
const b1 = crypto.getRandomValues(new Uint8Array(32));
const bl = wBlind(mBytes, a0, a1, b0, b1, R0, R1, X);
const sg = wSign(bl.c0, bl.c1, n0, n1, x);
const un = wUnblind(sg.s0, sg.s1, a0, a1);

const sigObj = {
  r0: b64e(bl.rp0), r1: b64e(bl.rp1),
  s0: b64e(un.sp0), s1: b64e(un.sp1),
  c0: b64e(bl.cp0), c1: b64e(bl.cp1),
  t: b64e(t),
};
const signatureB64 = Buffer.from(JSON.stringify(sigObj)).toString('base64');
const settlementB64 = Buffer.from(m).toString('base64');

// ── Mock ledger surface ────────────────────────────────────────────────
let verifySettlementCalls = [];
let ledgerVerdict = { valid: true };

function mockLedger() {
  const realFetch = global.fetch.bind(global);
  global.fetch = async (url, init) => {
    const u = String(url);
    if (u.endsWith('/blind-pubkey')) {
      return new Response(JSON.stringify({ X: b64e(X), R0: b64e(R0), R1: b64e(R1), t: b64e(t) }), { status: 200 });
    }
    if (u.endsWith('/verify-settlement')) {
      verifySettlementCalls.push(JSON.parse(init.body));
      return new Response(JSON.stringify(ledgerVerdict), { status: ledgerVerdict.valid ? 200 : 403 });
    }
    return realFetch(url, init);
  };
}

test.beforeEach(() => {
  verifySettlementCalls = [];
  ledgerVerdict = { valid: true };
  mockLedger();
});

test('valid captured signature verifies and consumes at the ledger', async () => {
  const v = await verifyLoveSettlement(DID, settlementB64, signatureB64);
  assert.equal(v.ok, true);
  assert.equal(verifySettlementCalls.length, 1);
  assert.equal(verifySettlementCalls[0].did, DID);
  assert.equal(verifySettlementCalls[0].sig.t, sigObj.t);
});

test('tampered signature is rejected locally', async () => {
  const bad = { ...sigObj, s0: b64e(crypto.getRandomValues(new Uint8Array(32))) };
  const v = await verifyLoveSettlement(DID, settlementB64, Buffer.from(JSON.stringify(bad)).toString('base64'));
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'signature');
  assert.equal(verifySettlementCalls.length, 0); // never reached the ledger
});

test('replayed nonce (ledger says consumed) is rejected', async () => {
  ledgerVerdict = { valid: false, reason: 'nonce-consumed' };
  const v = await verifyLoveSettlement(DID, settlementB64, signatureB64);
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'nonce-consumed');
});

test('DID mismatch between message and header is rejected', async () => {
  const v = await verifyLoveSettlement('did:someone-else', settlementB64, signatureB64);
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'did-mismatch');
});

test('malformed signature header is rejected', async () => {
  const v = await verifyLoveSettlement(DID, settlementB64, Buffer.from('not-json').toString('base64'));
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'malformed-signature');
});

test('missing settlement header is rejected', async () => {
  const v = await verifyLoveSettlement(DID, '', signatureB64);
  assert.equal(v.ok, false);
  assert.equal(v.reason, 'missing-headers');
});

// ── HTTP layer (index.mjs enforcement) ─────────────────────────────────
const fakeRouter = {
  catalog: [],
  backends: [],
  async handle(msg) {
    return { jsonrpc: '2.0', id: msg.id, result: { dispatched: true } };
  },
};

function httpPost({ sig, settle, did }) {
  const server = createServer(fakeRouter);
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      try {
        const headers = { 'content-type': 'application/json' };
        if (sig) headers['x-love-signature'] = sig;
        if (settle) headers['x-love-settlement'] = settle;
        if (did) headers['x-did'] = did;
        const res = await fetch(`http://127.0.0.1:${port}/mcp`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'oasis_status', arguments: {} } }),
        });
        resolve({ status: res.status, body: await res.text() });
      } finally {
        server.close();
      }
    });
  });
}

test('HTTP /mcp dispatches with a valid signature', async () => {
  const r = await httpPost({ sig: signatureB64, settle: settlementB64, did: DID });
  assert.equal(r.status, 200);
  assert.ok(JSON.parse(r.body).result.dispatched);
});

test('HTTP /mcp returns 403 with a tampered signature', async () => {
  const bad = { ...sigObj, s1: b64e(crypto.getRandomValues(new Uint8Array(32))) };
  const r = await httpPost({ sig: Buffer.from(JSON.stringify(bad)).toString('base64'), settle: settlementB64, did: DID });
  assert.equal(r.status, 403);
  assert.match(r.body, /Invalid LOVE settlement/);
});

test('HTTP /mcp without signature headers is unchanged (x402/free path)', async () => {
  const r = await httpPost({ sig: undefined, settle: undefined, did: undefined });
  assert.equal(r.status, 200);
  assert.ok(JSON.parse(r.body).result.dispatched);
});