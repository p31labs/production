/**
 * X-Wing — hybrid post-quantum KEM (draft-connolly-cfrg-xwing-kem).
 *
 * Combines ML-KEM-768 (FIPS 203, post-quantum) with X25519 (classical ECDH)
 * into a single compact KEM. Either algorithm alone is sufficient to keep the
 * shared secret safe, so the hybrid survives both "harvest-now-decrypt-later"
 * and any classical break.
 *
 * This module delegates the construction to the maintained, KAT-validated
 * preset `ml_kem768_x25519` from `@noble/post-quantum/hybrid.js` (aliased
 * `XWing`). It implements the exact spec:
 *
 *   ss = SHA3-256(ss_M || ss_X || ct_X || pk_X || 0x5c2e2f2f5e5c)
 *   dk = SHAKE128(ikm, 96)  — both component keys derive from one 32-byte seed
 *
 * Sizes (bytes):
 *   ML-KEM-768  pk=1184  sk-expanded=2400  ct=1088
 *   X25519      all=32
 *   X-Wing      pk=1216  ct=1120  sk=32 (seed form), ss=32
 *
 * Invariant: encapsulate ↔ decapsulate round-trips exactly.
 */

import { ml_kem768_x25519 } from "@noble/post-quantum/hybrid.js";

const XWING_PK = 1216;
const XWING_CT = 1120;
const XWING_SK = 32;
const XWING_SS = 32;

export const XWING_PK_LEN = XWING_PK;
export const XWING_SK_LEN = XWING_SK;
export const XWING_CT_LEN = XWING_CT;
export const XWING_SS_LEN = XWING_SS;

export interface XWingKeyPair {
  publicKey: Uint8Array; // XWING_PK_LEN
  secretKey: Uint8Array; // XWING_SK_LEN (seed)
}

export interface XWingEncap {
  ciphertext: Uint8Array; // XWING_CT_LEN
  sharedSecret: Uint8Array; // XWING_SS_LEN
}

export function generateXWingKeyPair(): XWingKeyPair {
  const kp = ml_kem768_x25519.keygen();
  return { publicKey: kp.publicKey, secretKey: kp.secretKey };
}

export function encapsulateXWing(publicKey: Uint8Array): XWingEncap {
  if (publicKey.length !== XWING_PK_LEN) {
    throw new Error(`xwing: expected publicKey length ${XWING_PK_LEN}, got ${publicKey.length}`);
  }
  const { cipherText, sharedSecret } = ml_kem768_x25519.encapsulate(publicKey);
  return { ciphertext: cipherText, sharedSecret };
}

export function decapsulateXWing(ciphertext: Uint8Array, secretKey: Uint8Array): Uint8Array {
  if (ciphertext.length !== XWING_CT_LEN) {
    throw new Error(`xwing: expected ciphertext length ${XWING_CT_LEN}, got ${ciphertext.length}`);
  }
  if (secretKey.length !== XWING_SK_LEN) {
    throw new Error(`xwing: expected secretKey length ${XWING_SK_LEN}, got ${secretKey.length}`);
  }
  return ml_kem768_x25519.decapsulate(ciphertext, secretKey);
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
