/**
 * OAuth 2.1 role tokens with RFC 8707 audience binding.
 *
 * This is the migration path documented in docs/ZERO-TRUST.md §4. The legacy
 * HS256 tokens in `src/roles.ts` carry `sub`/`role`/`iat`/`exp` and **no
 * audience**, which lets a token minted for one origin be replayed against
 * another. Tokens issued here add the `aud` claim set to the requesting
 * origin (`new URL(request.url).origin`) and verification enforces it, so a
 * resource server only accepts tokens minted for *its* origin.
 *
 * `src/roles.ts` is intentionally unchanged: this module is additive and is
 * activated per-request via the `OAUTH21_ENABLED` feature flag in
 * `src/worker.ts`. The final step of the documented migration — replacing
 * these bespoke HS256 tokens with `@cloudflare/workers-oauth-provider` — is
 * filed in docs/fix-plans/monetization-oauth21-provider-swap.md (blocked on
 * the coordinated dependency-install wave).
 */

import { ROLE_LEVEL, ROLE_TTL_SECONDS, type Role, type RoleToken } from '../roles';
import { b64urlToBytes, bytesToB64url, b64urlToString, stringToB64url } from './b64url';

export interface OAuth21TokenClaims {
  sub: string;
  role: Role;
  /** RFC 8707 audience — the origin this token was minted for. */
  aud: string;
  iat: number;
  exp: number;
  /** Unique token ID (RFC 7519 §4.1.7) — lets D1 record issuances per-token. */
  jti: string;
}

export interface OAuth21SignOptions {
  ttlSeconds?: number;
  nowMs?: number;
  jti?: string;
}

export interface OAuth21VerifyOptions {
  nowMs?: number;
}

/** Feature flag: the OAuth 2.1 path is opt-in until the provider swap lands. */
export function isOAuth21Enabled(flag: string | undefined): boolean {
  return flag === 'true';
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function decodePart<T>(part: string): T {
  return JSON.parse(b64urlToString(part)) as T;
}

/**
 * Issue an audience-bound role token (HS256). `aud` MUST be the origin the
 * token is intended for — set it to `new URL(request.url).origin` at issuance.
 */
export async function signRoleTokenOAuth21(
  secret: string,
  did: string,
  role: Role,
  aud: string,
  options: OAuth21SignOptions = {},
): Promise<string> {
  if (!did) throw new Error('oauth21: did required');
  if (!aud) throw new Error('oauth21: aud required');
  if (!(role in ROLE_LEVEL)) throw new Error(`oauth21: unknown role: ${role}`);

  const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
  const header = stringToB64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: OAuth21TokenClaims = {
    sub: did,
    role,
    aud,
    iat: now,
    exp: now + (options.ttlSeconds ?? ROLE_TTL_SECONDS[role]),
    jti: options.jti ?? crypto.randomUUID(),
  };
  const payloadPart = stringToB64url(JSON.stringify(payload));
  const signingInput = `${header}.${payloadPart}`;
  const key = await hmacKey(secret);
  const sig = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signingInput)),
  );
  return `${signingInput}.${bytesToB64url(sig)}`;
}

/** Decode (without verifying) an OAuth 2.1 role token. Null on malformed input. */
export function decodeRoleTokenOAuth21(token: string): OAuth21TokenClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const claims = decodePart<Partial<OAuth21TokenClaims>>(parts[1]);
    if (!claims || typeof claims !== 'object') return null;
    return {
      sub: String(claims.sub ?? ''),
      role: claims.role as Role,
      aud: String(claims.aud ?? ''),
      iat: Number(claims.iat ?? 0),
      exp: Number(claims.exp ?? 0),
      jti: String(claims.jti ?? ''),
    };
  } catch {
    return null;
  }
}

/**
 * Verify an OAuth 2.1 role token and enforce RFC 8707 audience binding: the
 * token's `aud` MUST match `expectedAud` (a string match, or membership when
 * `aud` is an array). Returns the role claims or null when the signature,
 * expiry, role, or audience does not validate.
 */
export async function verifyRoleTokenOAuth21(
  secret: string,
  token: string,
  expectedAud: string,
  options: OAuth21VerifyOptions = {},
): Promise<RoleToken | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signatureB64] = parts;
  try {
    const header = decodePart<{ alg?: string }>(headerB64);
    if (header.alg !== 'HS256') return null;

    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlToBytes(signatureB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) return null;

    const claims = decodePart<Partial<OAuth21TokenClaims> & { aud?: string | string[] }>(payloadB64);
    const now = Math.floor((options.nowMs ?? Date.now()) / 1000);
    if (typeof claims.exp !== 'number' || claims.exp < now) return null;
    if (!claims.role || !(claims.role in ROLE_LEVEL)) return null;

    // RFC 8707 — the token's audience MUST be bound to the requesting origin.
    const audOk = Array.isArray(claims.aud)
      ? claims.aud.includes(expectedAud)
      : claims.aud === expectedAud;
    if (!audOk) return null;

    return { sub: String(claims.sub ?? ''), role: claims.role as Role, exp: claims.exp };
  } catch {
    return null;
  }
}