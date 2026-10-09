/**
 * Role tokens — HS256 JWTs carrying a role claim (viewer / operator / admin).
 * Short-TTL by role. Used by the portal worker to gate write routes.
 * Role assignments are administered by the holder of ADMIN_TOKEN (issuance
 * endpoint) and recorded in config-db's app_roles table (audit trail).
 */

export type Role = 'viewer' | 'operator' | 'admin';

export const ROLE_LEVEL: Record<Role, number> = { viewer: 1, operator: 2, admin: 3 };

export const ROLE_TTL_SECONDS: Record<Role, number> = {
  viewer: 3600,
  operator: 900,
  admin: 900,
};

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

export async function signRoleToken(secret: string, did: string, role: Role): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64urlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = b64urlEncode(
    new TextEncoder().encode(JSON.stringify({ sub: did, role, iat: now, exp: now + ROLE_TTL_SECONDS[role] })),
  );
  const data = `${header}.${payload}`;
  const key = await hmacKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data).buffer as ArrayBuffer));
  return `${data}.${b64urlEncode(sig)}`;
}

export interface RoleToken {
  sub: string;
  role: Role;
  exp: number;
}

export async function verifyRoleToken(secret: string, token: string): Promise<RoleToken | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(signature).buffer as ArrayBuffer, new TextEncoder().encode(`${header}.${payload}`).buffer as ArrayBuffer);
    if (!valid) return null;
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))) as Partial<RoleToken>;
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    if (!claims.role || !(claims.role in ROLE_LEVEL)) return null;
    return { sub: String(claims.sub ?? ''), role: claims.role as Role, exp: claims.exp };
  } catch {
    return null;
  }
}

export function hasRole(token: RoleToken | null, required: Role): boolean {
  if (!token) return false;
  return ROLE_LEVEL[token.role] >= ROLE_LEVEL[required];
}