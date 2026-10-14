// taler-cbs/kdf.ts — per-withdrawal ephemeral nonces for the TWO-CHALLENGE
// Clause Blind Schnorr scheme (deployed love-ledger Worker).
//
// n_i = clamp(SHA-512("cbs-n{i}" ‖ x ‖ t)), i ∈ {0,1}
//
// SECURITY: a Schnorr nonce MUST be unique per signature. Each nonce pair
// is derived from the issuer secret x and a ONE-TIME nonce `t`, so every
// withdrawal gets a fresh (n_0, n_1) — and therefore fresh R_0, R_1. The
// domain separator "cbs-n0"/"cbs-n1" guarantees n_0 ≠ n_1 even for the same
// (x, t). Reusing `t` across two /blind-sign calls yields two signature
// pairs under the SAME nonces, from which x leaks
// (s_1 − s_2 = (c_1 − c_2)·x). The worker recomputes n_i deterministically
// from (x, t) so it stays stateless (no stored secret), while the
// consumed-`t` set (D1 cbs_nonce) enforces one-use and blocks the
// nonce-reuse key leak.
//
// SHA-512 via Web Crypto (native in Workers; no @noble).

async function deriveNonce(
  domain: string,
  x: Uint8Array,
  t: Uint8Array,
): Promise<Uint8Array> {
  const dom = new TextEncoder().encode(domain);
  const input = new Uint8Array(dom.length + x.length + t.length);
  input.set(dom, 0);
  input.set(x, dom.length);
  input.set(t, dom.length + x.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-512', input));
  // RFC-8032 clamp: clear bits 0,1,2; clear bit 255; set bit 254.
  hash[0] &= 248;
  hash[31] &= 127;
  hash[31] |= 64;
  return new Uint8Array(hash.slice(0, 32));
}

export function deriveNonce0(x: Uint8Array, t: Uint8Array): Promise<Uint8Array> {
  return deriveNonce('cbs-n0', x, t);
}

export function deriveNonce1(x: Uint8Array, t: Uint8Array): Promise<Uint8Array> {
  return deriveNonce('cbs-n1', x, t);
}