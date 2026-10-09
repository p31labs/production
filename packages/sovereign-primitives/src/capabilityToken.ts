/**
 * @file capabilityToken.ts — Post-quantum capability tokens.
 *
 * JOSE-style compact tokens signed with the composite Ed25519 + ML-DSA-65
 * signature. Fail-closed verification: any malformed / expired / mis-audience
 * / mis-room / tampered token is rejected. Used to gate P31 relays (e.g.
 * doc-relay rooms) and substrate APIs with short-lived, resource-scoped
 * capabilities instead of long-lived credentials (Kilo.ai-style sandbox
 * capability tokens, but with PQC signatures).
 *
 * Format: `b64url(header).b64url(payload).b64url(sigEd25519 || sigMLDSA65)`
 */

import {
  COMPOSITE_ALG,
  ED25519_SIG_LEN,
  MLDSA65_SIG_LEN,
  base64urlDecode,
  base64urlEncode,
  compositePublicKey,
  compositeSign,
  compositeVerify,
  type CompositeKeyPair,
  type CompositePublicKey,
  type CompositeSignature,
} from './composite.js';

export const CAP_TOKEN_TYP = 'PQCAP';

/**
 * Stable key identifier: base64url(SHA-256(ed25519Pub || mlDsa65Pub)).
 * Enables key rotation — a verifier that knows the current kid can reject
 * tokens signed by a superseded key (PostQuantum.Jwt token-profile practice).
 */
export async function compositeKeyFingerprint(pub: CompositePublicKey): Promise<string> {
  const material = new Uint8Array(pub.ed25519.length + pub.mlDsa65.length);
  material.set(pub.ed25519, 0);
  material.set(pub.mlDsa65, pub.ed25519.length);
  const digest = await crypto.subtle.digest('SHA-256', material);
  return base64urlEncode(new Uint8Array(digest));
}

export interface CapabilityClaims {
  /** issuer did:key */
  iss: string;
  /** optional subject did:key */
  sub?: string;
  /** audience, e.g. 'p31-doc-relay' */
  aud: string;
  /** resource id, e.g. the document id */
  room: string;
  /** capabilities, e.g. ['read','write','awareness'] */
  caps: string[];
  /**
   * Self-contained signing public keys (base64url). When present, a verifier
   * can validate the token without a separate key registry — the token is the
   * capability: it proves possession of the private key bound to these public
   * keys, is short-lived, and is scoped to `aud`/`room`.
   */
  pk?: { ed25519: string; mlDsa65: string };
  iat: number;
  exp: number;
}

export function encodeCapabilityClaims(claims: CapabilityClaims): string {
  return base64urlEncode(new TextEncoder().encode(JSON.stringify(claims)));
}

export function decodeCapabilityClaims(payloadB64: string): CapabilityClaims | null {
  try {
    const parsed = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as Record<
      string,
      unknown
    >;
    if (
      typeof parsed.iss !== 'string' ||
      typeof parsed.aud !== 'string' ||
      typeof parsed.room !== 'string' ||
      !Array.isArray(parsed.caps) ||
      !parsed.caps.every((c) => typeof c === 'string') ||
      typeof parsed.iat !== 'number' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    return parsed as unknown as CapabilityClaims;
  } catch {
    return null;
  }
}

/** Extracts the protected-header `kid` from a token, or null. */
export function tokenKid(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[0]))) as {
      kid?: unknown;
    };
    return typeof header.kid === 'string' ? header.kid : null;
  } catch {
    return null;
  }
}

/**
 * Mints a composite-signed capability token. `kid` (protected header) defaults
 * to the composite public-key fingerprint when not provided.
 */
export async function mintCapabilityToken(
  claims: CapabilityClaims,
  keys: CompositeKeyPair,
  kid?: string,
): Promise<string> {
  const kidValue = kid ?? (await compositeKeyFingerprint(compositePublicKey(keys)));
  const headerB64 = base64urlEncode(
    new TextEncoder().encode(
      JSON.stringify({ alg: COMPOSITE_ALG, typ: CAP_TOKEN_TYP, kid: kidValue }),
    ),
  );
  const payloadB64 = encodeCapabilityClaims(claims);
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await compositeSign(new TextEncoder().encode(signingInput), keys);
  const sigBytes = new Uint8Array(sig.ed25519.length + sig.mlDsa65.length);
  sigBytes.set(sig.ed25519, 0);
  sigBytes.set(sig.mlDsa65, sig.ed25519.length);
  return `${signingInput}.${base64urlEncode(sigBytes)}`;
}

export interface CapabilityVerifyOptions {
  expectAud?: string;
  expectRoom?: string;
  requireCaps?: string[];
  /** Reject tokens whose protected-header kid does not match (key rotation). */
  expectKid?: string;
  now?: number;
  /** clock leeway in ms; default 5s */
  leewayMs?: number;
}

interface ParsedCapabilityToken {
  headerB64: string;
  payloadB64: string;
  sigB64: string;
  claims: CapabilityClaims;
}

/** Structural, header, and claim checks (no signature). Fail-closed. */
function parseCapabilityToken(
  token: string,
  opts: CapabilityVerifyOptions,
): ParsedCapabilityToken | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, sigB64] = parts;

  let header: { alg?: unknown; typ?: unknown; kid?: unknown };
  try {
    header = JSON.parse(
      new TextDecoder().decode(base64urlDecode(headerB64)),
    ) as { alg?: unknown; typ?: unknown; kid?: unknown };
  } catch {
    return null;
  }
  if (header.alg !== COMPOSITE_ALG || header.typ !== CAP_TOKEN_TYP) return null;
  if (opts.expectKid && (typeof header.kid !== 'string' || header.kid !== opts.expectKid)) {
    return null;
  }

  const claims = decodeCapabilityClaims(payloadB64);
  if (!claims) return null;

  const now = opts.now ?? Date.now();
  const leeway = opts.leewayMs ?? 5000;
  if (now > claims.exp + leeway) return null;
  if (opts.expectAud && claims.aud !== opts.expectAud) return null;
  if (opts.expectRoom && claims.room !== opts.expectRoom) return null;
  if (opts.requireCaps) {
    for (const cap of opts.requireCaps) {
      if (!claims.caps.includes(cap)) return null;
    }
  }

  return { headerB64, payloadB64, sigB64, claims };
}

/** Fail-closed capability-token verification against an external public key. */
export async function verifyCapabilityToken(
  token: string,
  pub: CompositePublicKey,
  opts: CapabilityVerifyOptions = {},
): Promise<CapabilityClaims | null> {
  const parsed = parseCapabilityToken(token, opts);
  if (!parsed) return null;
  const { headerB64, payloadB64, sigB64, claims } = parsed;

  let sigBytes: Uint8Array;
  try {
    sigBytes = base64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (sigBytes.length !== ED25519_SIG_LEN + MLDSA65_SIG_LEN) return null;

  const sig: CompositeSignature = {
    ed25519: sigBytes.slice(0, ED25519_SIG_LEN),
    mlDsa65: sigBytes.slice(ED25519_SIG_LEN),
    alg: COMPOSITE_ALG,
  };
  const ok = await compositeVerify(new TextEncoder().encode(`${headerB64}.${payloadB64}`), sig, pub);
  return ok ? claims : null;
}

/**
 * Verifies a self-contained capability token (the token carries its signing
 * public keys in `claims.pk`), so no external key registry is needed. The
 * token is the capability: possession of the private key bound to `claims.pk`,
 * short-lived, scoped to `aud`/`room`/`caps`. Returns claims or null.
 */
export async function verifySelfContainedCapabilityToken(
  token: string,
  opts: CapabilityVerifyOptions = {},
): Promise<CapabilityClaims | null> {
  const parsed = parseCapabilityToken(token, opts);
  if (!parsed || !parsed.claims.pk) return null;
  const { headerB64, payloadB64, sigB64, claims } = parsed;
  if (!claims.pk) return null;

  let pub: CompositePublicKey;
  try {
    pub = {
      ed25519: base64urlDecode(claims.pk.ed25519),
      mlDsa65: base64urlDecode(claims.pk.mlDsa65),
      alg: COMPOSITE_ALG,
    };
  } catch {
    return null;
  }
  if (pub.ed25519.length !== 32 || pub.mlDsa65.length !== 1952) return null;

  let sigBytes: Uint8Array;
  try {
    sigBytes = base64urlDecode(sigB64);
  } catch {
    return null;
  }
  if (sigBytes.length !== ED25519_SIG_LEN + MLDSA65_SIG_LEN) return null;

  const sig: CompositeSignature = {
    ed25519: sigBytes.slice(0, ED25519_SIG_LEN),
    mlDsa65: sigBytes.slice(ED25519_SIG_LEN),
    alg: COMPOSITE_ALG,
  };
  const ok = await compositeVerify(new TextEncoder().encode(`${headerB64}.${payloadB64}`), sig, pub);
  return ok ? claims : null;
}