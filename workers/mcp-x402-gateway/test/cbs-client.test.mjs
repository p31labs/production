// cbs-client.test.mjs — unit test for the gateway's LOVE settlement client
// math (src/cbs-settlement.ts + src/taler-cbs/loader.ts).
//
// The gateway module imports ./taler_cs.wasm via wrangler's CompiledWasm
// rules (workerd-only), so this test mirrors the module 1:1 against the
// committed wasm artifact — the same pattern as
// workers/creation-accountant/taler-cbs/test/vector.mjs — and locks:
//   1. canonical settlement message shape (spec §3 key order)
//   2. blinding-factor derivation domains (cbs-a0/a1/b0/b1 over b-seed)
//   3. full client flow: blind -> (issuer signs) -> unblind -> verify
//   4. negative controls: tampered s', tampered message, wrong denom key,
//      one-challenge-only fill — all rejected.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const crypto = webcrypto;
const wasmBytes = readFileSync(new URL('../src/taler-cbs/taler_cs.wasm', import.meta.url));
const { instance } = await WebAssembly.instantiate(wasmBytes, { env: {} });
const EX = instance.exports;
const MEM = EX.memory;
const P = 32;
const BASE = Math.ceil(EX.__heap_base.value / 1024) * 1024;
const ensure = (o, n) => { while (MEM.buffer.byteLength < o + n) MEM.grow(1); };
const wr = (o, d) => { ensure(o, d.length); new Uint8Array(MEM.buffer, o, d.length).set(d); };
const rd = (o, n) => { ensure(o, n); return new Uint8Array(MEM.buffer, o, n).slice(); };

// Mirrors src/taler-cbs/loader.ts offsets exactly.
const OFF_A0 = () => BASE + 0, OFF_A1 = () => BASE + P, OFF_B0 = () => BASE + 2 * P, OFF_B1 = () => BASE + 3 * P,
  OFF_R0 = () => BASE + 4 * P, OFF_R1 = () => BASE + 5 * P, OFF_X = () => BASE + 6 * P,
  OFF_RP0 = () => BASE + 7 * P, OFF_RP1 = () => BASE + 8 * P, OFF_C0 = () => BASE + 9 * P,
  OFF_C1 = () => BASE + 10 * P, OFF_CP0 = () => BASE + 11 * P, OFF_CP1 = () => BASE + 12 * P,
  OFF_S0 = () => BASE + 13 * P, OFF_S1 = () => BASE + 14 * P, OFF_BUF = () => BASE + 16 * P;

const blind = (msg, a0, a1, b0, b1, R0, R1, X) => {
  const m = OFF_BUF() + P; wr(m, msg);
  wr(OFF_A0(), a0); wr(OFF_A1(), a1); wr(OFF_B0(), b0); wr(OFF_B1(), b1);
  wr(OFF_R0(), R0); wr(OFF_R1(), R1); wr(OFF_X(), X);
  if (EX.cs_blind(m, msg.length, OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_R0(), OFF_R1(), OFF_X(),
    OFF_RP0(), OFF_RP1(), OFF_C0(), OFF_C1(), OFF_CP0(), OFF_CP1()) !== 0) throw new Error('blind');
  return {
    rp0: rd(OFF_RP0(), P), rp1: rd(OFF_RP1(), P),
    c0: rd(OFF_C0(), P), c1: rd(OFF_C1(), P),
    cp0: rd(OFF_CP0(), P), cp1: rd(OFF_CP1(), P),
  };
};
const signBlinded = (c0, c1, n0, n1, x) => {
  wr(OFF_A0(), c0); wr(OFF_A1(), c1); wr(OFF_B0(), n0); wr(OFF_B1(), n1); wr(OFF_X(), x);
  if (EX.cs_sign_blinded(OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_X(), OFF_S0(), OFF_S1()) !== 0) throw new Error('sign');
  return { s0: rd(OFF_S0(), P), s1: rd(OFF_S1(), P) };
};
const unblind = (s0, s1, a0, a1) => {
  wr(OFF_A0(), s0); wr(OFF_A1(), s1); wr(OFF_B0(), a0); wr(OFF_B1(), a1);
  if (EX.cs_unblind(OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_S0(), OFF_S1()) !== 0) throw new Error('unblind');
  return { sp0: rd(OFF_S0(), P), sp1: rd(OFF_S1(), P) };
};
const verify = (msg, cp0, sp0, cp1, sp1, X, rp0, rp1) => {
  const m = OFF_BUF() + P; wr(m, msg);
  wr(OFF_A0(), cp0); wr(OFF_A1(), sp0); wr(OFF_B0(), cp1); wr(OFF_B1(), sp1);
  wr(OFF_X(), X); wr(OFF_R0(), rp0); wr(OFF_R1(), rp1);
  return EX.cs_verify(m, msg.length, OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_X(), OFF_R0(), OFF_R1()) === 0;
};
const base = (x) => { wr(OFF_A0(), x); if (EX.cs_base(OFF_A0(), OFF_C0()) !== 0) throw new Error('base'); return rd(OFF_C0(), P); };

// Mirrors cbs-settlement.ts factor(): SHA-512(domain ‖ seed)[0..32].
const factor = async (domain, seed) => {
  const dom = new TextEncoder().encode(domain);
  const input = new Uint8Array(dom.length + seed.length);
  input.set(dom, 0);
  input.set(seed, dom.length);
  return new Uint8Array(await crypto.subtle.digest('SHA-512', input)).slice(0, 32);
};
const rnd = () => crypto.getRandomValues(new Uint8Array(32));
const b64e = (u) => Buffer.from(u).toString('base64');

// Local issuer (mirrors the ledger's /blind-sign internals for this test).
const x = rnd();
const X = base(x);
const t = rnd();
const deriveNonce = async (domain) => {
  const dom = new TextEncoder().encode(domain);
  const input = new Uint8Array(dom.length + x.length + t.length);
  input.set(dom, 0); input.set(x, dom.length); input.set(t, dom.length + x.length);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-512', input));
  h[0] &= 248; h[31] &= 127; h[31] |= 64;
  return h.slice(0, 32);
};
const n0 = await deriveNonce('cbs-n0');
const n1 = await deriveNonce('cbs-n1');
const R0 = base(n0);
const R1 = base(n1);

test('canonical settlement message shape (spec §3 key order)', () => {
  const m = JSON.stringify({ version: '1', did: 'did:test:gw', tool: 'oasis_execute', amount: '0.05', t: b64e(t) });
  assert.equal(m, `{"version":"1","did":"did:test:gw","tool":"oasis_execute","amount":"0.05","t":"${b64e(t)}"}`);
});

test('blinding factor derivation is domain-separated', async () => {
  const seed = rnd();
  const a0 = await factor('cbs-a0', seed);
  const a1 = await factor('cbs-a1', seed);
  assert.notDeepEqual(a0, a1, 'cbs-a0 and cbs-a1 must differ for the same seed');
  assert.deepEqual(a0, await factor('cbs-a0', seed), 'derivation must be deterministic');
});

test('full client flow: blind -> sign -> unblind -> verify', async () => {
  const m = JSON.stringify({ version: '1', did: 'did:test:gw', tool: 'oasis_execute', amount: '0.05', t: b64e(t) });
  const mBytes = new TextEncoder().encode(m);
  const bseed = rnd();
  const [a0, a1, b0, b1] = await Promise.all([
    factor('cbs-a0', bseed), factor('cbs-a1', bseed),
    factor('cbs-b0', bseed), factor('cbs-b1', bseed),
  ]);
  const bl = blind(mBytes, a0, a1, b0, b1, R0, R1, X);
  const sg = signBlinded(bl.c0, bl.c1, n0, n1, x);
  const un = unblind(sg.s0, sg.s1, a0, a1);
  assert.ok(verify(mBytes, bl.cp0, un.sp0, bl.cp1, un.sp1, X, bl.rp0, bl.rp1), 'round-trip must verify');
});

test('tampered partial signature is rejected', async () => {
  const m = new TextEncoder().encode('settle did:test:gw amount:0.05 t:x');
  const bseed = rnd();
  const [a0, a1, b0, b1] = await Promise.all([
    factor('cbs-a0', bseed), factor('cbs-a1', bseed),
    factor('cbs-b0', bseed), factor('cbs-b1', bseed),
  ]);
  const bl = blind(m, a0, a1, b0, b1, R0, R1, X);
  const sg = signBlinded(bl.c0, bl.c1, n0, n1, x);
  const un = unblind(sg.s0, sg.s1, a0, a1);
  const bad = un.sp0.slice(); bad[0] ^= 0xff;
  assert.ok(!verify(m, bl.cp0, bad, bl.cp1, un.sp1, X, bl.rp0, bl.rp1));
});

test('tampered message is rejected', async () => {
  const m = new TextEncoder().encode('settle amount:0.05');
  const bseed = rnd();
  const [a0, a1, b0, b1] = await Promise.all([
    factor('cbs-a0', bseed), factor('cbs-a1', bseed),
    factor('cbs-b0', bseed), factor('cbs-b1', bseed),
  ]);
  const bl = blind(m, a0, a1, b0, b1, R0, R1, X);
  const sg = signBlinded(bl.c0, bl.c1, n0, n1, x);
  const un = unblind(sg.s0, sg.s1, a0, a1);
  const forged = new TextEncoder().encode('settle amount:5000');
  assert.ok(!verify(forged, bl.cp0, un.sp0, bl.cp1, un.sp1, X, bl.rp0, bl.rp1));
});

test('wrong denomination key is rejected', async () => {
  const m = new TextEncoder().encode('settle amount:0.05');
  const bseed = rnd();
  const [a0, a1, b0, b1] = await Promise.all([
    factor('cbs-a0', bseed), factor('cbs-a1', bseed),
    factor('cbs-b0', bseed), factor('cbs-b1', bseed),
  ]);
  const bl = blind(m, a0, a1, b0, b1, R0, R1, X);
  const sg = signBlinded(bl.c0, bl.c1, n0, n1, x);
  const un = unblind(sg.s0, sg.s1, a0, a1);
  const X2 = base(rnd());
  assert.ok(!verify(m, bl.cp0, un.sp0, bl.cp1, un.sp1, X2, bl.rp0, bl.rp1));
});

test('one-challenge-only forgery (random slot-1 fill) is rejected', async () => {
  const m = new TextEncoder().encode('settle amount:0.05');
  const bseed = rnd();
  const [a0, a1, b0, b1] = await Promise.all([
    factor('cbs-a0', bseed), factor('cbs-a1', bseed),
    factor('cbs-b0', bseed), factor('cbs-b1', bseed),
  ]);
  const bl = blind(m, a0, a1, b0, b1, R0, R1, X);
  const sg = signBlinded(bl.c0, bl.c1, n0, n1, x);
  const un = unblind(sg.s0, sg.s1, a0, a1);
  assert.ok(!verify(m, bl.cp0, un.sp0, rnd(), rnd(), X, bl.rp0, rnd()));
});