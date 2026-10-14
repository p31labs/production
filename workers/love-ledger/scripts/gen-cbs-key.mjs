// gen-cbs-key.mjs — generate a fresh BLIND_ISSUER_PRIVATE_KEY for the
// love-ledger two-challenge Clause Blind Schnorr issuer.
//
// A random 32-byte scalar, RFC-8032 clamped (clear bits 0,1,2; clear bit
// 255; set bit 254) — the same clamp the per-withdrawal nonces use. The
// Rust side reduces mod L regardless, so any nonzero 32-byte value works;
// clamping keeps the convention uniform. Prints the base64 secret (for
// `wrangler secret put BLIND_ISSUER_PRIVATE_KEY`) and the public X
// (published by GET /blind-pubkey) computed via the committed wasm.
//
// Usage: node scripts/gen-cbs-key.mjs
import { readFileSync } from 'node:fs';
import { webcrypto } from 'node:crypto';

const crypto = webcrypto;
const WASM = new URL('../taler-cbs/taler_cs.wasm', import.meta.url);
const buf = readFileSync(WASM);
const { instance } = await WebAssembly.instantiate(buf, { env: {} });
const ex = instance.exports;
const mem = ex.memory;
const HEAP = Math.ceil(ex.__heap_base.value / 1024) * 1024;
const U8 = (o, n) => new Uint8Array(mem.buffer, o, n);
const OFF_X = HEAP + 2048;
const OFF_OUT = HEAP + 4096;

const scalar = crypto.getRandomValues(new Uint8Array(32));
// RFC-8032 clamp
scalar[0] &= 248;
scalar[31] &= 127;
scalar[31] |= 64;

U8(OFF_X, 32).set(scalar);
if (ex.cs_base(OFF_X, OFF_OUT) !== 0) {
  console.error('cs_base failed');
  process.exit(1);
}
const X = U8(OFF_OUT, 32).slice();

console.log('BLIND_ISSUER_PRIVATE_KEY (base64):');
console.log(Buffer.from(scalar).toString('base64'));
console.log('public X (base64, served by GET /blind-pubkey):');
console.log(Buffer.from(X).toString('base64'));
console.log('\nDeploy:  cd /home/p31/production/workers/love-ledger && npx wrangler secret put BLIND_ISSUER_PRIVATE_KEY');