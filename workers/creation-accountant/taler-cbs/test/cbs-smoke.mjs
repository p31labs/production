// cbs-smoke.mjs — LIVE smoke test for the two-challenge CBS routes on the
// deployed love-ledger (https://love-ledger.p31ca.org).
//
// Flow: /health -> /blind-pubkey (X, R0, R1, t) -> blind (2 challenges)
// -> /blind-sign {c0,c1,t} -> {s0,s1} -> unblind -> /withdraw -> replay of
// the same coin must fail -> /verify-settlement (fresh t) -> replay of the
// same settlement must fail.
//
// Usage: node test/cbs-smoke.mjs [did] [amount]
// The DID must have a balance in the shared love-ledger D1 (love_accounts);
// seed one with e.g. `wrangler d1 execute` before running.

import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const crypto = webcrypto;
const BASE_URL = process.env.LOVE_LEDGER_URL || 'https://love-ledger.p31ca.org';
const DID = process.argv[2] || process.env.SMOKE_DID || 'did:smoke:cbs';
const AMOUNT = Number(process.argv[3] || process.env.SMOKE_AMOUNT || 1);
const WASM = new URL('../../src/taler_cs.wasm', import.meta.url);
const buf = readFileSync(WASM);

const { instance } = await WebAssembly.instantiate(buf, { env: {} });
const INST = instance;
const MEM = INST.exports.memory;
const P = 32;
const BASE = Math.ceil(INST.exports.__heap_base.value / 1024) * 1024;
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
  if (INST.exports.cs_blind(m, msg.length, OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_R0(), OFF_R1(), OFF_X(),
    OFF_RP0(), OFF_RP1(), OFF_C0(), OFF_C1(), OFF_CP0(), OFF_CP1()) !== 0) throw new Error('blind fail');
  return {
    rp0: rd(OFF_RP0(), P), rp1: rd(OFF_RP1(), P),
    c0: rd(OFF_C0(), P), c1: rd(OFF_C1(), P),
    cp0: rd(OFF_CP0(), P), cp1: rd(OFF_CP1(), P),
  };
}
function unblind(s0, s1, a0, a1) {
  wr(OFF_A0(), s0); wr(OFF_A1(), s1); wr(OFF_B0(), a0); wr(OFF_B1(), a1);
  if (INST.exports.cs_unblind(OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_S0(), OFF_S1()) !== 0) throw new Error('unblind fail');
  return { sp0: rd(OFF_S0(), P), sp1: rd(OFF_S1(), P) };
}
function verify(msg, cp0, sp0, cp1, sp1, X, rp0, rp1) {
  const m = OFF_BUF() + P; wr(m, msg);
  wr(OFF_A0(), cp0); wr(OFF_A1(), sp0); wr(OFF_B0(), cp1); wr(OFF_B1(), sp1);
  wr(OFF_X(), X); wr(OFF_R0(), rp0); wr(OFF_R1(), rp1);
  return INST.exports.cs_verify(m, msg.length, OFF_A0(), OFF_A1(), OFF_B0(), OFF_B1(), OFF_X(), OFF_R0(), OFF_R1()) === 0;
}
const b64e = (u) => Buffer.from(u).toString('base64');
const b64d = (s) => new Uint8Array(Buffer.from(s, 'base64'));
const rnd = () => crypto.getRandomValues(new Uint8Array(32));
const j = (r) => r.json();

// Settlement message: canonical JSON per docs/specs/love-settlement-cbs.md.
function settlementMsg(did, amount, t) {
  return JSON.stringify({ version: '1', did, tool: 'cbs-smoke', amount: String(amount), t: b64e(b64d(t)) });
}

// 0. health
const h = await fetch(`${BASE_URL}/health`);
console.log('0. /health ->', h.status, JSON.stringify(await h.json()));

// 1. blind-pubkey (two-challenge: X, R0, R1, t)
const pk = await j(await fetch(`${BASE_URL}/blind-pubkey`));
if (!pk.X || !pk.R0 || !pk.R1 || !pk.t) throw new Error('blind-pubkey missing fields: ' + JSON.stringify(pk));
console.log('1. /blind-pubkey ->', Object.keys(pk), 'X.len', b64d(pk.X).length, 'R0.len', b64d(pk.R0).length, 'R1.len', b64d(pk.R1).length);
const X = b64d(pk.X), R0 = b64d(pk.R0), R1 = b64d(pk.R1), t = pk.t;

// 2. blind (both challenges)
const msg = new TextEncoder().encode(settlementMsg(DID, AMOUNT, t));
const a0 = rnd(), a1 = rnd(), b0 = rnd(), b1 = rnd();
const { rp0, rp1, c0, c1, cp0, cp1 } = blind(msg, a0, a1, b0, b1, R0, R1, X);
console.log('2. blind -> c0/c1 blinded, R\'0/R\'1 computed');

// 3. blind-sign
const sRes = await j(await fetch(`${BASE_URL}/blind-sign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ c0: b64e(c0), c1: b64e(c1), t }) }));
if (!sRes.s0 || !sRes.s1) throw new Error('blind-sign failed: ' + JSON.stringify(sRes));
console.log('3. /blind-sign -> s0.len', b64d(sRes.s0).length, 's1.len', b64d(sRes.s1).length);

// 3b. replay the SAME t with a different challenge pair -> must be rejected
const a0b = rnd(), a1b = rnd(), b0b = rnd(), b1b = rnd();
const repl = blind(msg, a0b, a1b, b0b, b1b, R0, R1, X);
const sRep = await j(await fetch(`${BASE_URL}/blind-sign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ c0: b64e(repl.c0), c1: b64e(repl.c1), t }) }));
if (!sRep.error) throw new Error('replayed t accepted — nonce leak protection broken');
console.log('3b. /blind-sign replay of t -> correctly rejected (' + sRep.error + ')');

const { sp0, sp1 } = unblind(b64d(sRes.s0), b64d(sRes.s1), a0, a1);

// 3c. local verify before spending
if (!verify(msg, cp0, sp0, cp1, sp1, X, rp0, rp1)) throw new Error('LOCAL verify failed after unblind');
console.log('3c. local two-challenge verify -> VALID');

// 4. withdraw (balance check, love_chain entry, nonce consume)
const w = await j(await fetch(`${BASE_URL}/withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ did: DID, amount: AMOUNT, msg: b64e(msg), r0: b64e(rp0), r1: b64e(rp1), s0: b64e(sp0), s1: b64e(sp1), c0: b64e(cp0), c1: b64e(cp1), t }) }));
console.log('4. /withdraw ->', w.success ? 'OK' : 'FAIL', JSON.stringify(w).slice(0, 200));
if (!w.success) process.exit(1);

// 5. replay same coin -> must FAIL (court-admissible single-use)
const w2 = await j(await fetch(`${BASE_URL}/withdraw`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ did: DID, amount: AMOUNT, msg: b64e(msg), r0: b64e(rp0), r1: b64e(rp1), s0: b64e(sp0), s1: b64e(sp1), c0: b64e(cp0), c1: b64e(cp1), t }) }));
console.log('5. replay withdraw ->', w2.success ? 'UNEXPECTED-OK' : 'correctly rejected (' + w2.error + ')');
if (w2.success) process.exit(1);

// 6. verify-settlement with a FRESH issuance (bridge-side settlement path)
const pk2 = await j(await fetch(`${BASE_URL}/blind-pubkey`));
const t2 = pk2.t;
const msg2 = new TextEncoder().encode(settlementMsg(DID, AMOUNT, t2));
const a2_0 = rnd(), a2_1 = rnd(), b2_0 = rnd(), b2_1 = rnd();
const b2 = blind(msg2, a2_0, a2_1, b2_0, b2_1, b64d(pk2.R0), b64d(pk2.R1), b64d(pk2.X));
const s2 = await j(await fetch(`${BASE_URL}/blind-sign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ c0: b64e(b2.c0), c1: b64e(b2.c1), t: t2 }) }));
const u2 = unblind(b64d(s2.s0), b64d(s2.s1), a2_0, a2_1);
const v = await j(await fetch(`${BASE_URL}/verify-settlement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ did: DID, msg: b64e(msg2), sig: { r0: b64e(b2.rp0), r1: b64e(b2.rp1), s0: b64e(u2.sp0), s1: b64e(u2.sp1), c0: b64e(b2.cp0), c1: b64e(b2.cp1), t: t2 } }) }));
console.log('6. /verify-settlement ->', v.valid ? 'valid' : 'INVALID ' + v.reason, JSON.stringify(v).slice(0, 160));
if (!v.valid) process.exit(1);

// 7. replay the same settlement -> idempotent rejection
const v2 = await j(await fetch(`${BASE_URL}/verify-settlement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ did: DID, msg: b64e(msg2), sig: { r0: b64e(b2.rp0), r1: b64e(b2.rp1), s0: b64e(u2.sp0), s1: b64e(u2.sp1), c0: b64e(b2.cp0), c1: b64e(b2.cp1), t: t2 } }) }));
console.log('7. replay settlement ->', v2.valid ? 'UNEXPECTED-valid' : 'correctly rejected (' + v2.reason + ')');
if (v2.valid) process.exit(1);

// 8. tampered settlement message -> rejected
const tamperedMsg = new TextEncoder().encode(settlementMsg(DID, AMOUNT + 1, t2));
const v3 = await j(await fetch(`${BASE_URL}/verify-settlement`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ did: DID, msg: b64e(tamperedMsg), sig: { r0: b64e(b2.rp0), r1: b64e(b2.rp1), s0: b64e(u2.sp0), s1: b64e(u2.sp1), c0: b64e(b2.cp0), c1: b64e(b2.cp1), t: t2 } }) }));
console.log('8. tampered-msg settlement ->', v3.valid ? 'UNEXPECTED-valid' : 'correctly rejected (' + v3.reason + ')');
if (v3.valid) process.exit(1);

console.log('\nCBS LIVE SMOKE (two-challenge): PASS');