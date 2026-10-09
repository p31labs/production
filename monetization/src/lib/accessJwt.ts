/**
 * Cloudflare Access JWT validation.
 *
 * Validates the `Cf-Access-Jwt-Assertion` header against the team's signing
 * keys published at https://<teamDomain>.cloudflareaccess.com/cdn-cgi/access/certs
 * (RS256, WebCrypto). On success returns the identity claims, otherwise null.
 * The JWKS is cached per-isolate for a short TTL.
 */
export interface AccessJwtIdentity {
  email: string;
  sub: string;
  country: string;
}

interface JwksCacheEntry {
  keys: AccessJwk[];
  fetchedAt: number;
}

/** JsonWebKey plus the kid/use fields Cloudflare Access publishes. */
interface AccessJwk extends JsonWebKey {
  kid?: string;
  use?: string;
}

const JWKS_TTL_MS = 5 * 60 * 1000;

const jwksCache = new Map<string, JwksCacheEntry>();

function b64urlToBytes(part: string): Uint8Array {
  const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '=');
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function decodePart<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(part))) as T;
}

async function fetchJwks(teamDomain: string): Promise<AccessJwk[]> {
  const cached = jwksCache.get(teamDomain);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;
  const res = await fetch(`https://${teamDomain}.cloudflareaccess.com/cdn-cgi/access/certs`);
  if (!res.ok) return cached?.keys ?? [];
  const payload = (await res.json()) as { keys?: AccessJwk[] };
  const keys = payload.keys ?? [];
  jwksCache.set(teamDomain, { keys, fetchedAt: Date.now() });
  return keys;
}

/**
 * Verify the request carries a valid Cloudflare Access JWT for the given team
 * domain. Returns the identity claims, or null when the header is absent,
 * malformed, expired, or the signature does not validate.
 */
export async function verifyAccessJwt(request: Request, teamDomain: string): Promise<AccessJwtIdentity | null> {
  try {
    const assertion = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!assertion) return null;

    const parts = assertion.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, signatureB64] = parts;

    const header = decodePart<{ alg?: string; kid?: string }>(headerB64);
    if (header.alg !== 'RS256' || !header.kid) return null;

    const keys = await fetchJwks(teamDomain);
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return null;

    const verifyKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = b64urlToBytes(signatureB64);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', verifyKey, sig.buffer as ArrayBuffer, data.buffer as ArrayBuffer);
    if (!valid) return null;

    const claims = decodePart<{ email?: string; sub?: string; country?: string; exp?: number; iss?: string }>(payloadB64);
    if (!claims.exp || claims.exp < Math.floor(Date.now() / 1000)) return null;
    if (claims.iss && !claims.iss.includes(teamDomain)) return null;

    return { email: claims.email ?? '', sub: claims.sub ?? '', country: claims.country ?? '' };
  } catch {
    return null;
  }
}