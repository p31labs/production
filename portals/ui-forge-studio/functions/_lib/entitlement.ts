/**
 * _lib/entitlement.ts — client for the ENTITLEMENT worker (Wave 3).
 *
 * Built against the frozen contract:
 *   POST /api/entitlement/check   { did, amount, loves? } → { allowed, reason?, remaining? }
 *   POST /api/entitlement/consume { did, amount }         → { allowed, remaining? } | 402 { error: 'over-allowance', ... }
 *   POST /api/entitlement/tier-set { did, tier }          (admin)
 *   POST /api/love/issue          { did, amount, reason }
 *
 * Write/consume routes require `Authorization: Bearer <roleJwt>` — the studio
 * signs a short-TTL HS256 token with `ROLE_JWT_SECRET` (shared with the
 * entitlement worker; see _lib/roles.ts).
 *
 * The backend is reached via a service binding (`env.ENTITLEMENT`) when the
 * wrangler config wires one, otherwise by plain fetch to
 * https://entitlement.trimtab-signal.workers.dev. While the entitlement worker
 * is still being built, any network/5xx failure fails OPEN so the studio never
 * hard-stops — 402 (over-allowance) is the only hard gate.
 */
import { signRoleToken } from './roles';

export interface EntitlementEnv {
  ENTITLEMENT?: Fetcher;
  ENTITLEMENT_URL?: string;
  ROLE_JWT_SECRET?: string;
}

/** Default backend. Overridable via env.ENTITLEMENT_URL for local/staging. */
export const ENTITLEMENT_URL = 'https://entitlement.trimtab-signal.workers.dev';

export interface EntitlementResult {
  allowed: boolean;
  remaining?: string;
  error?: string;
}

function backendUrl(env: EntitlementEnv, path: string): URL {
  return new URL(path, env.ENTITLEMENT_URL ?? ENTITLEMENT_URL);
}

async function backendPost(env: EntitlementEnv, path: string, body: Record<string, unknown>, did: string): Promise<Response> {
  const token = env.ROLE_JWT_SECRET ? await signRoleToken(env.ROLE_JWT_SECRET, did, 'operator') : '';
  const url = backendUrl(env, path);
  const init = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  };
  if (env.ENTITLEMENT) return env.ENTITLEMENT.fetch(url, init);
  return fetch(url, init);
}

/** POST /api/entitlement/consume — meter one run before the pipeline runs. */
export async function consumeRun(env: EntitlementEnv, did: string | null): Promise<EntitlementResult> {
  if (!did) return { allowed: true };
  try {
    const res = await backendPost(env, '/api/entitlement/consume', { did, amount: '1' }, did);
    if (res.status === 402) {
      const body = (await res.json().catch(() => ({}))) as { error?: string; remaining?: string };
      return { allowed: false, error: body.error ?? 'over-allowance', remaining: body.remaining };
    }
    if (res.ok) {
      const body = (await res.json()) as { allowed?: boolean; remaining?: string };
      return { allowed: body.allowed !== false, remaining: body.remaining };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}

/** POST /api/entitlement/check — preview allowance for the tier pill. */
export async function checkRun(env: EntitlementEnv, did: string | null): Promise<EntitlementResult> {
  if (!did) return { allowed: true };
  try {
    const res = await backendPost(env, '/api/entitlement/check', { did, amount: '1' }, did);
    if (res.ok) {
      const body = (await res.json()) as { allowed?: boolean; remaining?: string };
      return { allowed: body.allowed !== false, remaining: body.remaining };
    }
    return { allowed: true };
  } catch {
    return { allowed: true };
  }
}