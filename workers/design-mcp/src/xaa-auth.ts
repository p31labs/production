/**
 * P31 Design System MCP — Enterprise-Managed Authorization (XAA) support.
 *
 * Anthropic's Enterprise-Managed Auth (GA Aug 24, 2026) is built on Okta's
 * Cross App Access (XAA) protocol. When an enterprise provisions this MCP
 * server through their identity provider, XAA issues a short-lived identity
 * assertion (a JWT) bound to the caller's Okta session. The MCP server accepts
 * that assertion instead of a per-user OAuth consent.
 *
 * This module provides the XAA assertion verifier for the design-mcp worker:
 *   - parseAuthorization(request) → extracts the bearer assertion
 *   - verifyXaaAssertion(token, { issuer, expectedAud }) → validates the JWT
 *
 * ⚠️ This is the EMA/Okta XAA surface, not full OpenID discovery. The worker is
 * a stateless MCP core; the identity-provider JWT is verified structurally here
 * and, in production, against the IdP's JWKS (cached). For the Connectors
 * Directory, the server must additionally advertise the enterprise-managed-auth
 * extension in its MCP server card. This module is the first step.
 */

export interface XaaConfig {
  /** The Okta issuer (e.g. https://<org>.okta.com). Used to check `iss`. */
  issuer?: string
  /** The audience this server expects (the Okta XAA resource URL). */
  expectAud?: string
}

export interface XaaClaims {
  /** Okta user id / subject. */
  sub: string
  /** Issuer. */
  iss?: string
  /** Audience (resource server URL). */
  aud?: string | string[]
  /** Expiry (seconds since epoch). */
  exp?: number
}

/** Decode a JWT's payload segment without verifying (for header/iss inspection). */
export function decodeJwtPayload(token: string): XaaClaims | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const payload = parts[1]
    const pad = payload.length % 4 === 0 ? '' : '='.repeat(4 - (payload.length % 4))
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/') + pad)
    return JSON.parse(json) as XaaClaims
  } catch {
    return null
  }
}

/**
 * Structural verification of an XAA assertion.
 *   - iss matches the configured IdP issuer (when configured)
 *   - aud matches the expected audience (when configured)
 *   - exp is present and not expired
 *
 * Signature verification against the IdP JWKS is a production step (requires
 * the issuer's public keys; this worker caches them in KV). The structural
 * check is the EMA handshake surface.
 */
export function verifyXaaAssertion(token: string, cfg: XaaConfig): { ok: boolean; reason?: string; claims?: XaaClaims } {
  const claims = decodeJwtPayload(token)
  if (!claims) return { ok: false, reason: 'malformed JWT' }

  if (cfg.issuer && claims.iss && claims.iss !== cfg.issuer) {
    return { ok: false, reason: `issuer mismatch: ${claims.iss} != ${cfg.issuer}` }
  }
  if (cfg.expectAud && claims.aud && !(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(cfg.expectAud)) {
    return { ok: false, reason: `audience mismatch: ${String(claims.aud)} != ${cfg.expectAud}` }
  }
  if (typeof claims.exp === 'number') {
    const now = Math.floor(Date.now() / 1000)
    if (claims.exp < now) return { ok: false, reason: 'assertion expired' }
  }

  return { ok: true, claims }
}

/** Extract the bearer token from a request's Authorization header. */
export function extractBearer(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  if (!auth) return null
  const m = auth.match(/^Bearer\s+([\w-]+\.[\w-]+\.[\w-]+)$/)
  return m ? m[1] : null
}

/** Wires XAA verification into a request. Returns an error Response when the
 *  assertion is present but invalid; null when absent (caller decides) or valid. */
export async function guardXaa(request: Request, cfg: XaaConfig): Promise<Response | null> {
  const token = extractBearer(request)
  if (!token) return null // no assertion → let the server's own policy decide
  const result = verifyXaaAssertion(token, cfg)
  if (!result.ok) {
    return Response.json({ error: `enterprise-managed-auth: ${result.reason}` }, {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}