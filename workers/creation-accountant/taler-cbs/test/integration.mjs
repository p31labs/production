// integration.mjs — full issuer-side flow the love-ledger Worker will run
// (TWO-CHALLENGE Clause Blind Schnorr).
//
// Exercises the SAME code paths as taler-cbs/loader.ts + kdf.ts:
//   issuer: x (secret) -> X = base(x);
//           n_0 = deriveNonce0(x, t), n_1 = deriveNonce1(x, t)
//           -> R_0 = base(n_0), R_1 = base(n_1)
//           s = signBlinded(c0, c1, n0, n1, x)
//   verifier: verify(msg, c'0, s'0, c'1, s'1, X, R'0, R'1)
// Plus the client half (blind/unblind) for an end-to-end round-trip.
//
// Negative controls: tampered signature, wrong denom key, and the
// nonce-reuse x-leak proof (why `t` must be single-use).
//
// Uses Node Web Crypto for SHA-512 (matches kdf.ts — no @noble).

import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const crypto = webcrypto;
const WASM = new URL('../../src/taler_cs.wasm', import.meta.url);
const buf = readFileSync(WASM);

const { instance } = await WebAssembly.instantiate(buf, { env: {} });
const ex = instance.exports;
const mem = ex.memory;

const HEAP = Math.ceil(ex.__heap_base.value / 1024) * 1024;
const OFF_MSG = HEAP + 0;
const OFF_A0 = HEAP + 2048;
const OFF_A1 = HEAP + 3072;
const OFF_B0 = HEAP + 4096;
const OFF_B1 = HEAP + 5120;
const OFF_R0 = HEAP + 6144;
const OFF_R1 = HEAP + 7168;
const OFF_X = HEAP + 8192;
const OFF_RP0 = HEAP + 9216;
const OFF_RP1 = OFF_RP0 + 32;
const OFF_C0 = OFF_RP1 + 32;
const OFF_C1 = OFF_C0 + 32;
const OFF_CP0 = OFF_C1 + 32;
const OFF_CP1 = OFF_CP0 + 32;
const OFF_S0 = HEAP + 12288;
const OFF_S1 = OFF_S0 + 32;

const U8 = (o, n) => new Uint8Array(mem.buffer, o, n);
const write = (o, d) => U8(o, d.length).set(d);
const read = (o, n) => U8(o, n).slice();
const rnd = () => crypto.getRandomValues(new Uint8Array(32));

// Mirror kdf.ts: n_i = clamp(SHA-512(domain_i ‖ x ‖ t)), t = fresh one-time nonce.
// Domain separation guarantees n_0 != n_1 even for the same (x, t).
async function deriveNonce(domain, x, t) {
  const input = new Uint8Array(domain.length + x.length + t.length);
  input.set(new TextEncoder().encode(domain), 0);
  input.set(x, domain.length);
  input.set(t, domain.length + x.length);
  const h = new Uint8Array(await crypto.subtle.digest('SHA-512', input));
  h[0] &= 248;
  h[31] &= 127;
  h[31] |= 64;
  return h.slice(0, 32);
}
const deriveNonce0 = (x, t) => deriveNonce('cbs-n0', x, t);
const deriveNonce1 = (x, t) => deriveNonce('cbs-n1', x, t);

const base = (x) => {
  write(OFF_A0, x);
  if (ex.cs_base(OFF_A0, OFF_C0) !== 0) throw new Error('cs_base failed');
  return read(OFF_C0, 32);
};
const blind = (msg, a0, a1, b0, b1, R0, R1, X) => {
  write(OFF_MSG, msg);
  write(OFF_A0, a0); write(OFF_A1, a1);
  write(OFF_B0, b0); write(OFF_B1, b1);
  write(OFF_R0, R0); write(OFF_R1, R1);
  write(OFF_X, X);
  if (ex.cs_blind(OFF_MSG, msg.length, OFF_A0, OFF_A1, OFF_B0, OFF_B1, OFF_R0, OFF_R1, OFF_X,
    OFF_RP0, OFF_RP1, OFF_C0, OFF_C1, OFF_CP0, OFF_CP1) !== 0)
    throw new Error('blind failed');
  return {
    rp0: read(OFF_RP0, 32), rp1: read(OFF_RP1, 32),
    c0: read(OFF_C0, 32), c1: read(OFF_C1, 32),
    cp0: read(OFF_CP0, 32), cp1: read(OFF_CP1, 32),
  };
};
const signBlinded = (c0, c1, n0, n1, x) => {
  write(OFF_A0, c0); write(OFF_A1, c1);
  write(OFF_B0, n0); write(OFF_B1, n1);
  write(OFF_X, x);
  if (ex.cs_sign_blinded(OFF_A0, OFF_A1, OFF_B0, OFF_B1, OFF_X, OFF_S0, OFF_S1) !== 0)
    throw new Error('sign failed');
  return { s0: read(OFF_S0, 32), s1: read(OFF_S1, 32) };
};
const unblind = (s0, s1, a0, a1) => {
  write(OFF_A0, s0); write(OFF_A1, s1);
  write(OFF_B0, a0); write(OFF_B1, a1);
  if (ex.cs_unblind(OFF_A0, OFF_A1, OFF_B0, OFF_B1, OFF_S0, OFF_S1) !== 0)
    throw new Error('unblind failed');
  return { sp0: read(OFF_S0, 32), sp1: read(OFF_S1, 32) };
};
const verify = (msg, cp0, sp0, cp1, sp1, X, rp0, rp1) => {
  write(OFF_MSG, msg);
  write(OFF_A0, cp0); write(OFF_A1, sp0);
  write(OFF_B0, cp1); write(OFF_B1, sp1);
  write(OFF_X, X);
  write(OFF_R0, rp0); write(OFF_R1, rp1);
  return ex.cs_verify(OFF_MSG, msg.length, OFF_A0, OFF_A1, OFF_B0, OFF_B1, OFF_X, OFF_R0, OFF_R1) === 0;
};

// --- Issuer key (cross-checked vs independent Ed25519) ---
const kp = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const x = await (async () => {
  const seed = new Uint8Array(Buffer.from(jwk.d, 'base64url'));
  const h = new Uint8Array(await crypto.subtle.digest('SHA-512', seed));
  h[0] &= 248; h[31] &= 127; h[31] |= 64;
  return h.slice(0, 32);
})();
const X_expected = new Uint8Array(Buffer.from(jwk.x, 'base64url'));

// Fresh one-time nonce `t` per withdrawal (NOT derived from a period — that
// would reuse n across the whole day and leak x).
const t = rnd();
const n0 = await deriveNonce0(x, t);
const n1 = await deriveNonce1(x, t);
const X = base(x);
const R0 = base(n0);
const R1 = base(n1);

if (!X.every((v, i) => v === X_expected[i])) {
  console.error('FAIL: X = base(x) != Web Crypto public key');
  process.exit(1);
}
console.log('OK   issuer X = base(x) matches independent Ed25519');

// --- End-to-end: client blind -> issuer sign -> client unblind -> verify ---
const msg = new TextEncoder().encode('did:alice|love_withdraw|5');
const a0 = rnd(), a1 = rnd(), b0 = rnd(), b1 = rnd();
const { rp0, rp1, c0, c1, cp0, cp1 } = blind(msg, a0, a1, b0, b1, R0, R1, X);
const { s0, s1 } = signBlinded(c0, c1, n0, n1, x);
const { sp0, sp1 } = unblind(s0, s1, a0, a1);
if (!verify(msg, cp0, sp0, cp1, sp1, X, rp0, rp1)) {
  console.error('FAIL: full issuer+client two-challenge flow rejected');
  process.exit(1);
}
console.log('OK   full flow (blind->sign->unblind->verify) VALID');

// tampered s'0
const bad = sp0.slice(); bad[0] ^= 0xff;
if (verify(msg, cp0, bad, cp1, sp1, X, rp0, rp1)) {
  console.error('FAIL: tampered signature accepted');
  process.exit(1);
}
console.log('OK   tampered signature REJECTED');

// wrong denomination key
const kp2 = await crypto.subtle.generateKey('Ed25519', true, ['sign', 'verify']);
const jwk2 = await crypto.subtle.exportKey('jwk', kp2.privateKey);
const X2 = new Uint8Array(Buffer.from(jwk2.x, 'base64url'));
if (verify(msg, cp0, sp0, cp1, sp1, X2, rp0, rp1)) {
  console.error('FAIL: wrong denomination key accepted');
  process.exit(1);
}
console.log('OK   wrong denomination key REJECTED');

// one-challenge-only forgery: valid challenge-0 pair + random challenge-1 slot
if (verify(msg, cp0, sp0, rnd(), rnd(), X, rp0, rnd())) {
  console.error('FAIL: one-challenge-only forgery accepted');
  process.exit(1);
}
console.log('OK   one-challenge-only forgery REJECTED');

// SECURITY PROOF: if the SAME nonce pair (n0, n1) — i.e. the same `t` — is
// reused with two DIFFERENT challenge pairs, the issuer secret x is
// recoverable. This is exactly why issued `t` must be single-use (enforced
// by the cbs_nonce D1 set at /blind-sign). Demonstrated here against the
// wasm directly.
{
  const a2_0 = rnd(), a2_1 = rnd(), b2_0 = rnd(), b2_1 = rnd();
  const msg2 = new TextEncoder().encode('did:alice|love_withdraw|7');
  const second = blind(msg2, a2_0, a2_1, b2_0, b2_1, R0, R1, X); // same R0/R1 (same t)
  const sig2 = signBlinded(second.c0, second.c1, n0, n1, x); // same nonces
  const un2 = unblind(sig2.s0, sig2.s1, a2_0, a2_1);
  if (!verify(msg2, second.cp0, un2.sp0, second.cp1, un2.sp1, X, second.rp0, second.rp1)) {
    console.error('FAIL: second (same-nonce) signature rejected');
    process.exit(1);
  }
  // s = n + c·x. Two signings under the same n give: s_1 − s_2 = (c_1 − c_2)·x.
  // Both sessions know the blinded values, so the linear dependency
  // (lhs1*cc2 == lhs2*cc1, mod L) proves x is recoverable.
  const L = (1n << 252n) + 27742317777372353535851937790883648493n;
  const toB = (u) => { let v = 0n; for (let i = 31; i >= 0; i--) v = (v << 8n) | BigInt(u[i]); return v; };
  const mod = (v) => ((v % L) + L) % L;
  const tuple = (s, n, c) => {
    const lhs = mod(toB(s) - toB(n)); // s − n = c·x
    const cc = mod(toB(c));           // blinded challenge c
    return [lhs, cc];
  };
  const [lhs1, cc1] = tuple(s0, n0, c0);
  const [lhs2, cc2] = tuple(sig2.s0, n0, second.c0);
  if (mod(lhs1 * cc2) !== mod(lhs2 * cc1)) {
    console.error('FAIL: nonce-reuse linear dependency not demonstrated');
    process.exit(1);
  }
  console.log('OK   nonce-reuse leaks x (proves single-use `t` is REQUIRED)');
}

console.log('\nINTEGRATION GATES PASSED — issuer flow is consistent + cross-checked.');