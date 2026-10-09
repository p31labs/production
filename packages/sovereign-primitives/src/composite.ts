/**
 * @file composite.ts — Composite Ed25519 + ML-DSA-65 signatures.
 *
 * P31 PQC auth core (research-aligned with the IETF Composite Signature work):
 * two independent signatures bound to the same message, valid only when BOTH
 * verify. Ed25519 keeps classical compatibility and ~128-bit security;
 * ML-DSA-65 (NIST FIPS 204, category 3) provides the post-quantum component.
 * This is the assertion primitive for QPJ device identity, the trust mesh, and
 * capability tokens.
 */

import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';

export const COMPOSITE_ALG = 'Ed25519+ML-DSA-65';

/** Ed25519 signature length in bytes. */
export const ED25519_SIG_LEN = 64;
/** ML-DSA-65 signature length in bytes (FIPS 204, category 3). */
export const MLDSA65_SIG_LEN = 3309;

export interface CompositeKeyPair {
  ed25519: { publicKey: Uint8Array<ArrayBuffer>; privateKey: Uint8Array<ArrayBuffer> };
  mlDsa65: { publicKey: Uint8Array<ArrayBuffer>; privateKey: Uint8Array<ArrayBuffer> };
  alg: typeof COMPOSITE_ALG;
  createdAt: number;
}

export interface CompositePublicKey {
  ed25519: Uint8Array<ArrayBuffer>;
  mlDsa65: Uint8Array<ArrayBuffer>;
  alg: typeof COMPOSITE_ALG;
}

export interface CompositeSignature {
  ed25519: Uint8Array<ArrayBuffer>;
  mlDsa65: Uint8Array<ArrayBuffer>;
  alg: typeof COMPOSITE_ALG;
}

export function base64urlEncode(bytes: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64urlDecode(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? 0 : 4 - (b64.length % 4);
  const binary = atob(b64 + '='.repeat(pad));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function compositePublicKey(keys: CompositeKeyPair): CompositePublicKey {
  return { ed25519: keys.ed25519.publicKey, mlDsa65: keys.mlDsa65.publicKey, alg: COMPOSITE_ALG };
}

/**
 * Best-effort probe for native WebCrypto ML-DSA (shipping in Servo 0.0.5;
 * enabled by default in Chromium). When it returns true, `compositeSign` /
 * `compositeVerify` could be swapped to `crypto.subtle` with the `ML-DSA-65`
 * algorithm name — kept behind this helper until the API lands in TypeScript
 * lib types. Until then, `@noble/post-quantum` is the active engine.
 */
export async function probeNativeMLDSA(): Promise<boolean> {
  if (typeof crypto === 'undefined' || !crypto.subtle) return false;
  try {
    await crypto.subtle.importKey(
      'raw',
      new Uint8Array(32),
      { name: 'ML-DSA-65' } as Algorithm,
      true,
      ['sign', 'verify'],
    );
    return true;
  } catch {
    return false;
  }
}

/** Generates an Ed25519 (WebCrypto) + ML-DSA-65 (FIPS 204) keypair. */
export async function generateCompositeKeyPair(): Promise<CompositeKeyPair> {
  const classical = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify']);
  const ed25519Pub = new Uint8Array(await crypto.subtle.exportKey('raw', classical.publicKey));
  const ed25519Priv = new Uint8Array(await crypto.subtle.exportKey('pkcs8', classical.privateKey));
  const pq = ml_dsa65.keygen();
  return {
    ed25519: { publicKey: ed25519Pub, privateKey: ed25519Priv },
    mlDsa65: { publicKey: pq.publicKey, privateKey: pq.secretKey },
    alg: COMPOSITE_ALG,
    createdAt: Date.now(),
  };
}

/** Signs `message` with both Ed25519 and ML-DSA-65. */
export async function compositeSign(
  message: Uint8Array<ArrayBuffer>,
  keys: CompositeKeyPair,
): Promise<CompositeSignature> {
  const edKey = await crypto.subtle.importKey('pkcs8', keys.ed25519.privateKey, 'Ed25519', false, [
    'sign',
  ]);
  const edSig = new Uint8Array(await crypto.subtle.sign('Ed25519', edKey, message));
  const pqSig = ml_dsa65.sign(message, keys.mlDsa65.privateKey);
  return { ed25519: edSig, mlDsa65: pqSig, alg: COMPOSITE_ALG };
}

/** Verifies BOTH components; fails closed (false on any error). */
export async function compositeVerify(
  message: Uint8Array<ArrayBuffer>,
  sig: CompositeSignature,
  pub: CompositePublicKey,
): Promise<boolean> {
  try {
    const edKey = await crypto.subtle.importKey('raw', pub.ed25519, 'Ed25519', false, ['verify']);
    const edOk = await crypto.subtle.verify('Ed25519', edKey, sig.ed25519, message);
    if (!edOk) return false;
    return ml_dsa65.verify(sig.mlDsa65, message, pub.mlDsa65);
  } catch {
    return false;
  }
}