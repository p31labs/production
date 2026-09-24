/**
 * @file pqcIdentity.ts — hybrid post-quantum identity key material.
 *
 * Ported from QPJ. Each member's identity binds an Ed25519 + ML-DSA-65 (NIST
 * FIPS 204) composite key. The private material is base64url and can be
 * dual-wrapped: once under the non-extractable device key (persistent) and
 * once under a PIN-derived AES-GCM key (caregiver unlock). Assertions and
 * capability tokens are signed with the composite scheme.
 */

import {
  base64urlDecode,
  base64urlEncode,
  generateCompositeKeyPair,
  compositeSign,
  compositeVerify,
  COMPOSITE_ALG,
  type CompositeKeyPair,
  type CompositePublicKey,
} from '@p31/sovereign-primitives'

export interface B64KeyMaterial {
  ed25519Pub: string
  ed25519PrivPkcs8: string
  mldsa65Pub: string
  mldsa65Priv: string
}

export interface B64PublicKeys {
  ed25519Pub: string
  mldsa65Pub: string
}

export interface WrappedSecret {
  iv: string
  ct: string
}

export interface DualWrappedSecret {
  device: WrappedSecret
  pin: WrappedSecret
}

export function toCompositeKeyPair(m: B64KeyMaterial): CompositeKeyPair {
  return {
    ed25519: { publicKey: base64urlDecode(m.ed25519Pub), privateKey: base64urlDecode(m.ed25519PrivPkcs8) },
    mlDsa65: { publicKey: base64urlDecode(m.mldsa65Pub), privateKey: base64urlDecode(m.mldsa65Priv) },
    alg: COMPOSITE_ALG,
    createdAt: Date.now(),
  }
}

export function toCompositePublicKey(pub: B64PublicKeys): CompositePublicKey {
  return { ed25519: base64urlDecode(pub.ed25519Pub), mlDsa65: base64urlDecode(pub.mldsa65Pub), alg: COMPOSITE_ALG }
}

/** Generate a fresh hybrid keypair as base64url material. */
export async function generateHybridKeyMaterial(): Promise<B64KeyMaterial> {
  const kp = await generateCompositeKeyPair()
  return {
    ed25519Pub: base64urlEncode(kp.ed25519.publicKey),
    ed25519PrivPkcs8: base64urlEncode(kp.ed25519.privateKey),
    mldsa65Pub: base64urlEncode(kp.mlDsa65.publicKey),
    mldsa65Priv: base64urlEncode(kp.mlDsa65.privateKey),
  }
}

/** Derive an AES-GCM key from the caregiver PIN (PBKDF2). */
export async function derivePinKey(pin: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`p31:workspace:pin:${pin}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  )
  const salt = new TextEncoder().encode('p31-workspace-pqc-key-salt-v1')
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function aesGcmWrap(secretB64: string, key: CryptoKey): Promise<WrappedSecret> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = base64urlDecode(secretB64)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data))
  return { iv: base64urlEncode(iv), ct: base64urlEncode(ct) }
}

export async function aesGcmUnwrap(wrapped: WrappedSecret, key: CryptoKey): Promise<string> {
  const iv = base64urlDecode(wrapped.iv)
  const ct = base64urlDecode(wrapped.ct)
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct))
  return base64urlEncode(pt)
}

/** Dual AES-GCM wrap of the same secret: device key + PIN-derived key. */
export async function wrapSecretDual(
  secretB64: string,
  deviceKey: CryptoKey,
  pinKey: CryptoKey,
): Promise<DualWrappedSecret> {
  return {
    device: await aesGcmWrap(secretB64, deviceKey),
    pin: await aesGcmWrap(secretB64, pinKey),
  }
}

export async function unwrapSecret(wrapped: WrappedSecret, key: CryptoKey): Promise<string> {
  return aesGcmUnwrap(wrapped, key)
}

/** Composite (Ed25519 + ML-DSA-65) assertion signature over a message string. */
export async function signAssertion(
  message: string,
  keyMat: B64KeyMaterial,
): Promise<{ ed25519: string; mlDsa65: string; alg: typeof COMPOSITE_ALG }> {
  const sig = await compositeSign(new TextEncoder().encode(message), toCompositeKeyPair(keyMat))
  return {
    ed25519: base64urlEncode(sig.ed25519),
    mlDsa65: base64urlEncode(sig.mlDsa65),
    alg: COMPOSITE_ALG,
  }
}

/** Verify a composite assertion signature. */
export async function verifyAssertion(
  message: string,
  signature: { ed25519: string; mlDsa65: string },
  pub: B64PublicKeys,
): Promise<boolean> {
  return compositeVerify(
    new TextEncoder().encode(message),
    {
      ed25519: base64urlDecode(signature.ed25519),
      mlDsa65: base64urlDecode(signature.mlDsa65),
      alg: COMPOSITE_ALG,
    },
    toCompositePublicKey(pub),
  )
}