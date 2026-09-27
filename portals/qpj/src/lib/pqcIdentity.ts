/**
 * @file pqcIdentity.ts — QPJ hybrid (Ed25519 + ML-DSA-65) identity primitives.
 *
 * The client-side twin of @p31ca/sovereign-primitives (the canonical module this
 * portal vendors). The Ed25519 did:key stays the stable identifier; ML-DSA-65
 * (FIPS 204) is bound to it and used for post-quantum auth assertions and
 * capability tokens. The ML-DSA-65 secret key can be wrapped at rest under a
 * PIN-derived AES-GCM key (PBKDF2), so the caregiver PIN gates PQC signing.
 */

import {
  COMPOSITE_ALG,
  base64urlDecode,
  base64urlEncode,
  compositePublicKey,
  compositeSign,
  compositeVerify,
  generateCompositeKeyPair,
  mintCapabilityToken,
  verifySelfContainedCapabilityToken,
  type CompositeKeyPair,
  type CompositePublicKey,
  type CompositeSignature,
} from '@p31ca/sovereign-primitives';

export interface B64KeyMaterial {
  ed25519Pub: string;
  ed25519PrivPkcs8: string;
  mldsa65Pub: string;
  mldsa65Priv: string;
}

export interface B64PublicKeys {
  ed25519Pub: string;
  mldsa65Pub: string;
}

export interface B64CompositeSignature {
  ed25519: string;
  mlDsa65: string;
  alg: typeof COMPOSITE_ALG;
}

export interface WrappedSecret {
  iv: string;
  ct: string;
}

export function toCompositeKeyPair(m: B64KeyMaterial): CompositeKeyPair {
  return {
    ed25519: { publicKey: base64urlDecode(m.ed25519Pub), privateKey: base64urlDecode(m.ed25519PrivPkcs8) },
    mlDsa65: { publicKey: base64urlDecode(m.mldsa65Pub), privateKey: base64urlDecode(m.mldsa65Priv) },
    alg: COMPOSITE_ALG,
    createdAt: Date.now(),
  };
}

export function toCompositePublicKey(pub: B64PublicKeys): CompositePublicKey {
  return { ed25519: base64urlDecode(pub.ed25519Pub), mlDsa65: base64urlDecode(pub.mldsa65Pub), alg: COMPOSITE_ALG };
}

/** Generates a fresh hybrid keypair as base64url material. */
export async function generateHybridKeyMaterial(): Promise<B64KeyMaterial> {
  const kp = await generateCompositeKeyPair();
  return {
    ed25519Pub: base64urlEncode(kp.ed25519.publicKey),
    ed25519PrivPkcs8: base64urlEncode(kp.ed25519.privateKey),
    mldsa65Pub: base64urlEncode(kp.mlDsa65.publicKey),
    mldsa65Priv: base64urlEncode(kp.mlDsa65.privateKey),
  };
}

/** Derives an AES-GCM key from the caregiver PIN (PBKDF2). */
export async function derivePinKey(pin: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(`p31:qpj:pin:${pin}`),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  const salt = new TextEncoder().encode('p31-qpj-pqc-key-salt-v1');
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 150000, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function aesGcmWrap(secretB64: string, key: CryptoKey): Promise<WrappedSecret> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = base64urlDecode(secretB64);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  return { iv: base64urlEncode(iv), ct: base64urlEncode(ct) };
}

export async function aesGcmUnwrap(wrapped: WrappedSecret, key: CryptoKey): Promise<string> {
  const iv = base64urlDecode(wrapped.iv);
  const ct = base64urlDecode(wrapped.ct);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
  return base64urlEncode(pt);
}

/** Two independent AES-GCM wraps of the same secret: one under the device key
 * (persistent, non-extractable CryptoKey) and one under a PIN-derived key. */
export interface DualWrappedSecret {
  device: WrappedSecret;
  pin: WrappedSecret;
}

export async function wrapSecretDual(
  secretB64: string,
  deviceKey: CryptoKey,
  pinKey: CryptoKey,
): Promise<DualWrappedSecret> {
  return {
    device: await aesGcmWrap(secretB64, deviceKey),
    pin: await aesGcmWrap(secretB64, pinKey),
  };
}

/** Unwraps a single layer with the given key. */
export async function unwrapSecret(wrapped: WrappedSecret, key: CryptoKey): Promise<string> {
  return aesGcmUnwrap(wrapped, key);
}

/** Composite (Ed25519 + ML-DSA-65) assertion signature over a message string. */
export async function signAssertion(
  message: string,
  keyMat: B64KeyMaterial,
): Promise<B64CompositeSignature> {
  const sig = await compositeSign(new TextEncoder().encode(message), toCompositeKeyPair(keyMat));
  return { ed25519: base64urlEncode(sig.ed25519), mlDsa65: base64urlEncode(sig.mlDsa65), alg: sig.alg };
}

/** Composite assertion verification. */
export async function verifyAssertion(
  message: string,
  sig: B64CompositeSignature,
  pub: B64PublicKeys,
): Promise<boolean> {
  const decoded: CompositeSignature = {
    ed25519: base64urlDecode(sig.ed25519),
    mlDsa65: base64urlDecode(sig.mlDsa65),
    alg: COMPOSITE_ALG,
  };
  return compositeVerify(new TextEncoder().encode(message), decoded, toCompositePublicKey(pub));
}

/** Verifies a mesh presence assertion over the canonical `did:timestamp` string. */
export async function verifyMeshPayload(payload: {
  did: string;
  timestamp: number;
  publicKey?: string;
  signature?: string;
  mldsa65Sig?: string;
  mldsa65Pub?: string;
}): Promise<boolean> {
  if (!payload.mldsa65Sig || !payload.mldsa65Pub || !payload.publicKey || !payload.signature) {
    return false;
  }
  return verifyAssertion(
    `${payload.did}:${payload.timestamp}`,
    { ed25519: payload.signature, mlDsa65: payload.mldsa65Sig, alg: COMPOSITE_ALG },
    { ed25519Pub: payload.publicKey, mldsa65Pub: payload.mldsa65Pub },
  );
}

/** Mints a self-contained PQC capability token for the phos doc relay. */
export async function mintRelayCapabilityToken(
  room: string,
  keyMat: B64KeyMaterial,
  ttlMs = 15 * 60 * 1000,
): Promise<string> {
  const kp = toCompositeKeyPair(keyMat);
  const pk = compositePublicKey(kp);
  const iat = Date.now();
  return mintCapabilityToken(
    {
      iss: 'did:key:qpj',
      aud: 'p31-doc-relay',
      room,
      caps: ['read', 'write', 'awareness'],
      pk: { ed25519: base64urlEncode(pk.ed25519), mlDsa65: base64urlEncode(pk.mlDsa65) },
      iat,
      exp: iat + ttlMs,
    },
    kp,
  );
}

export async function verifyRelayCapabilityToken(token: string): Promise<boolean> {
  const claims = await verifySelfContainedCapabilityToken(token, {
    expectAud: 'p31-doc-relay',
    requireCaps: ['read', 'write', 'awareness'],
  });
  return claims !== null;
}

// ── QR pairing (DNA-Connect-style: challenge → PQC signature → verify) ─────

export interface QrChallenge {
  nonce: string;
  rp: string;
  exp: number;
}

/** Creates a single-use pairing challenge bound to a relying party. */
export function createQrChallenge(rp: string, ttlMs = 120_000): QrChallenge {
  return { nonce: crypto.randomUUID(), rp, exp: Date.now() + ttlMs };
}

export function encodeQrChallenge(challenge: QrChallenge): string {
  return base64urlEncode(new TextEncoder().encode(JSON.stringify(challenge)));
}

export function decodeQrChallenge(value: string): QrChallenge | null {
  try {
    const parsed = JSON.parse(
      new TextDecoder().decode(base64urlDecode(value)),
    ) as Partial<QrChallenge>;
    if (
      typeof parsed.nonce === 'string' &&
      typeof parsed.rp === 'string' &&
      typeof parsed.exp === 'number'
    ) {
      return { nonce: parsed.nonce, rp: parsed.rp, exp: parsed.exp };
    }
    return null;
  } catch {
    return null;
  }
}

/** Composite-signs the challenge (the pairing proof of possession). */
export async function signQrChallenge(
  challenge: QrChallenge,
  keyMat: B64KeyMaterial,
): Promise<B64CompositeSignature> {
  return signAssertion(encodeQrChallenge(challenge), keyMat);
}

/** Verifies a challenge signature; rejects expired challenges (replay window). */
export async function verifyQrChallenge(
  challenge: QrChallenge,
  sig: B64CompositeSignature,
  pub: B64PublicKeys,
): Promise<boolean> {
  if (Date.now() > challenge.exp) return false;
  return verifyAssertion(encodeQrChallenge(challenge), sig, pub);
}