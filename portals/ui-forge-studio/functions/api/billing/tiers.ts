/**
 * api/billing/tiers.ts — the plans + the did's live allowance (Wave 3).
 *
 * GET → { plans, did, tier, remaining, limit, used, role }.
 *
 * - `plans` mirrors what the ENTITLEMENT worker serves.
 * - `did` comes from the session cookie (middleware) or the `X-Forge-Did`
 *   header the client always sends.
 * - `tier` is the studio's recorded tier for the did (AUTH_DB `users` table,
 *   default 'free'); the entitlement worker is the source of truth for quota.
 * - `remaining` comes from `POST /api/entitlement/check` against the
 *   entitlement worker (fail-open while the worker is still being built).
 */
import { PLANS, planForTier, type PlanId } from '../../../src/lib/tiers';
import { checkRun } from '../../_lib/entitlement';
import type { EntitlementEnv } from '../../_lib/entitlement';
import type { SessionData } from '../../_middleware';

interface BillingEnv extends EntitlementEnv {
  AUTH_DB?: D1Database;
}

export const onRequestGet: PagesFunction<BillingEnv, string, SessionData> = async ({ request, env, data }) => {
  const session = data as SessionData;
  const sessionDid = session.did;
  const headerDid = request.headers.get('X-Forge-Did')?.trim();
  const did = sessionDid ?? (headerDid && headerDid.startsWith('did:key:') ? headerDid : null) ?? null;

  let tier: PlanId = 'free';
  if (did && env.AUTH_DB) {
    const { results } = await env.AUTH_DB
      .prepare('SELECT tier FROM forge_users WHERE did = ?')
      .bind(did)
      .all<{ tier: string }>()
      .catch(() => ({ results: [] as Array<{ tier: string }> }));
    if (results.length > 0 && results[0].tier && results[0].tier in PLANS) {
      tier = results[0].tier as PlanId;
    }
    await env.AUTH_DB
      .prepare('INSERT OR IGNORE INTO forge_users (did, tier, created_at) VALUES (?, ?, ?)')
      .bind(did, 'free', Date.now())
      .run()
      .catch(() => {
        // table missing — best-effort
      });
  }

  const plan = planForTier(tier);
  const usage = did ? await checkRun(env, did) : { allowed: true, remaining: undefined };
  const remainingNum = usage.remaining !== undefined ? Number(usage.remaining) : null;
  const remaining = remainingNum !== null && Number.isFinite(remainingNum) ? String(Math.max(0, remainingNum)) : (plan.runs !== null ? String(plan.runs) : null);
  const used = remaining !== null && plan.runs !== null ? Math.max(0, plan.runs - Number(remaining)) : null;

  return Response.json({
    plans: PLANS,
    did,
    tier,
    remaining,
    limit: plan.runs,
    used,
    role: session.role ?? null,
  });
};