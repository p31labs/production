/**
 * _lib/session.ts — the `p31_session` cookie (Wave 3).
 *
 * A signed, non-JWT token: `base64url({ did, role, iat, exp }).hmac-sha256`.
 * Set on successful passkey register/login and verified in `_middleware.ts`.
 * The cookie is HttpOnly + SameSite=Lax so every Pages Function on the origin
 * reads the session without re-prompting.
 */
import { ROLE_LEVEL, type Role } from './roles';

export const SESSION_COOKIE = 'p31_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionClaims {
  did: string;
  role: Role;
  iat: number;
  exp: number;
}

function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(secret: string, did: string, role: Role): Promise<string> {
  const now = Date.now();
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify({ did, role, iat: now, exp: now + SESSION_TTL_MS })));
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload).buffer as ArrayBuffer));
  return `${payload}.${b64urlEncode(sig)}`;
}

export async function verifySession(secret: string, token: string): Promise<SessionClaims | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sigB64] = parts;
  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(sigB64).buffer as ArrayBuffer, new TextEncoder().encode(payload).buffer as ArrayBuffer);
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Partial<SessionClaims>;
    if (!claims.did || typeof claims.did !== 'string') return null;
    if (!claims.exp || claims.exp < Date.now()) return null;
    if (!claims.role || !(claims.role in ROLE_LEVEL)) return null;
    return { did: claims.did, role: claims.role as Role, iat: claims.iat ?? Date.now(), exp: claims.exp };
  } catch {
    return null;
  }
}

/** Parse the `p31_session` cookie from a Cookie header. */
export function readSessionCookie(request: Request): string | null {
  const cookie = request.headers.get('Cookie') ?? '';
  for (const part of cookie.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return rest.join('=') || null;
  }
  return null;
}

export function sessionCookieHeader(token: string, secure = true): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}