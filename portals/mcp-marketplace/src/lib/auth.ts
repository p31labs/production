import type { MeResponse, Role } from '@/types'

/**
 * auth.ts — RBAC + SSO scaffold for the marketplace portal.
 *
 * Principal resolution is header-based: the portal sends `X-Principal` on
 * every registry call. When Cloudflare Access protects mcp.p31ca.org, the
 * authenticated user's email is injected by Access and surfaced here; an
 * explicit local principal (localStorage) overrides for dev. `SSO_PROVIDER`
 * controls which source is authoritative (none | cloudflare-access | oidc).
 */
export const SSO_PROVIDER: 'none' | 'cloudflare-access' | 'oidc' =
  (import.meta.env?.VITE_SSO_PROVIDER as 'cloudflare-access' | 'oidc') || 'cloudflare-access'

const PRINCIPAL_KEY = 'p31:mcp:principal'

export function getPrincipal(): string | null {
  try {
    return localStorage.getItem(PRINCIPAL_KEY)
  } catch {
    return null
  }
}

export function setPrincipal(principal: string | null): void {
  try {
    if (principal) localStorage.setItem(PRINCIPAL_KEY, principal)
    else localStorage.removeItem(PRINCIPAL_KEY)
  } catch {
    /* storage unavailable */
  }
}

/** Headers every portal→registry call should carry for RBAC. */
export function authHeaders(): Record<string, string> {
  const h: Record<string, string> = {}
  const p = getPrincipal()
  if (p) h['X-Principal'] = p
  return h
}

export const ROLE_LABEL: Record<Role, string> = {
  viewer: 'Viewer',
  publisher: 'Publisher',
  reviewer: 'Reviewer',
  admin: 'Admin',
}

/** Resolve the current session from the registry's GET /me. */
export async function resolveMe(): Promise<MeResponse | null> {
  const res = await fetch('https://mcp-registry.trimtab-signal.workers.dev/me', {
    headers: { ...authHeaders() },
  })
  if (!res.ok) return null
  return (await res.json()) as MeResponse
}