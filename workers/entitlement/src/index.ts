/**
 * entitlement — the P31 revenue gate.
 *
 * Owns the tier → allowance contract. Every paid pipeline run or API call
 * consumes from a DID's per-cycle allowance; the Free tier caps at 5 runs,
 * Pro at 50, Team at 250 pooled. Over-allowance returns HTTP 402 so the
 * consuming surface can show an upgrade path (never a hard wall).
 *
 * Contract (frozen, mirrored by the monetization portal client + the
 * capital-machine MCP):
 *   POST /entitlement/check  { did, amount, loves? }  → { allowed, reason?, remaining? }
 *   POST /entitlement/consume { did, amount }          → { allowed, remaining? } | 402
 *   POST /entitlement/tier-set { did, tier }           (admin) → { did, tier, allowance }
 *   POST /love/issue          { did, amount, reason }  → { total_love }
 *   GET  /health                                      → { status: 'ok' }
 *
 * Storage: D1 table `entitlements` (did PK, tier, used, cycle). Cycles are
 * monthly buckets derived from the UTC calendar month (YYYY-MM).
 */

export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
}

const CYCLES_PER_TIER: Record<string, { runs: number; seats: number }> = {
  free: { runs: 5, seats: 1 },
  pro: { runs: 50, seats: 1 },
  team: { runs: 250, seats: 5 },
  enterprise: { runs: 1000000, seats: 100 },
};

function cycleKey(now: Date): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

interface EntRow {
  did: string;
  tier: string;
  used: number;
  cycle: string;
}

async function load(env: Env, did: string, cycle: string): Promise<EntRow> {
  const res = await env.DB.prepare(
    'SELECT did, tier, used, cycle FROM entitlements WHERE did = ?1 AND cycle = ?2',
  ).bind(did, cycle).first<EntRow>();
  if (res) return res;
  const tier = 'free';
  return { did, tier, used: 0, cycle };
}

async function save(env: Env, row: EntRow): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO entitlements (did, tier, used, cycle)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(did, cycle) DO UPDATE SET used = ?3`,
  ).bind(row.did, row.tier, row.used, row.cycle).run();
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') {
      return json({ status: 'ok', service: 'entitlement' });
    }

    if (path === '/entitlement/tier-set' && request.method === 'POST') {
      const adminToken = request.headers.get('X-Admin-Token') ?? '';
      if (!env.ADMIN_TOKEN || adminToken !== env.ADMIN_TOKEN) {
        return json({ error: 'admin token required (X-Admin-Token)' }, 401);
      }
      try {
        const body = (await request.json()) as { did?: string; tier?: string };
        if (!body.did || !body.tier) return json({ error: 'did + tier required' }, 400);
        const tier = CYCLES_PER_TIER[body.tier] ? body.tier : 'free';
        const cycle = cycleKey(new Date());
        const row = await load(env, body.did, cycle);
        row.tier = tier;
        await save(env, row);
        return json({ did: body.did, tier, allowance: CYCLES_PER_TIER[tier].runs, remaining: CYCLES_PER_TIER[tier].runs - row.used });
      } catch {
        return json({ error: 'bad request' }, 400);
      }
    }

    if (path === '/entitlement/consume' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { did?: string; amount?: string };
        if (!body.did) return json({ error: 'did required' }, 400);
        const amount = Number(body.amount ?? '1');
        if (!Number.isFinite(amount) || amount <= 0) return json({ error: 'invalid amount' }, 400);
        const cycle = cycleKey(new Date());
        const row = await load(env, body.did, cycle);
        const cap = CYCLES_PER_TIER[row.tier].runs;
        const remaining = cap - row.used;
        if (remaining < amount) {
          return json(
            { allowed: false, error: 'over-allowance', remaining: Math.max(0, remaining), tier: row.tier, cycle },
            402,
          );
        }
        row.used += amount;
        await save(env, row);
        return json({ allowed: true, remaining: cap - row.used, tier: row.tier, cycle });
      } catch {
        return json({ error: 'bad request' }, 400);
      }
    }

    if (path === '/entitlement/check' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { did?: string; amount?: string; loves?: boolean };
        if (!body.did) return json({ error: 'did required' }, 400);
        const amount = Number(body.amount ?? '1');
        const cycle = cycleKey(new Date());
        const row = await load(env, body.did, cycle);
        const cap = CYCLES_PER_TIER[row.tier].runs;
        const remaining = cap - row.used;
        return json({
          allowed: remaining >= amount,
          reason: remaining >= amount ? undefined : 'over-allowance',
          remaining: Math.max(0, remaining),
          tier: row.tier,
          cycle,
        });
      } catch {
        return json({ error: 'bad request' }, 400);
      }
    }

    if (path === '/love/issue' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { did?: string; amount?: string; reason?: string };
        if (!body.did) return json({ error: 'did required' }, 400);
        const amount = Number(body.amount ?? '1');
        await env.DB.prepare(
          'INSERT INTO love_ledger (did, amount, reason, created_at) VALUES (?1, ?2, ?3, ?4)',
        ).bind(body.did, amount, body.reason ?? '', Date.now()).run();
        const sum = await env.DB.prepare(
          'SELECT COALESCE(SUM(amount), 0) AS total FROM love_ledger WHERE did = ?1',
        ).bind(body.did).first<{ total: number }>();
        return json({ total_love: sum?.total ?? 0, did: body.did });
      } catch {
        return json({ error: 'bad request' }, 400);
      }
    }

    return json({ error: `not found: ${path}` }, 404);
  },
};