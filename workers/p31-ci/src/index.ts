export interface Env {
  CI_DB: D1Database;
  CI_ISSUE_TOKEN?: string;
  /** config-gateway SLI source (set in [vars]). */
  SLI_URL?: string;
}

const SLO_TARGET = 0.999; // 99.9% availability
const SLO_WINDOW_MS = 30 * 86400000; // 30-day error budget
const SLO_ALLOWED_DOWN = (1 - SLO_TARGET) * SLO_WINDOW_MS; // ~43.2 min
const FAST_BURN = 2; // 2% of budget in a ~90min window → fast burn
const SLOW_BURN = 1.2;

const ALLOWED_EVENT_TYPES = new Set([
  'deploy_start',
  'deploy_success',
  'deploy_failure',
  'deploy_rollback',
  'pr_created',
  'pr_reviewed',
]);

interface RecordBody {
  event_type: string;
  service: string;
  commit_sha?: string;
  actor_did?: string;
  lead_time_ms?: number;
  deploy_duration_ms?: number;
  change_failure?: number;
  mttr_ms?: number;
}

interface DoraRow {
  id: string;
  event_type: string;
  service: string;
  commit_sha: string | null;
  actor_did: string | null;
  lead_time_ms: number | null;
  deploy_duration_ms: number | null;
  change_failure: number;
  mttr_ms: number | null;
  created_at: number;
}

function json(res: unknown, status = 200): Response {
  return new Response(JSON.stringify(res), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, POST, OPTIONS',
      'access-control-allow-headers': 'content-type, x-issue-token',
    },
  });
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function p75(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(0.75 * sorted.length) - 1);
  return sorted[idx];
}

export default {
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    if (!env.SLI_URL) return;
    const res = await fetch(`${env.SLI_URL}?minutes=90`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const sli = (await res.json()) as { availability: number | null; p95_latency_ms: number | null; p99_latency_ms: number | null; total_calls: number; ok_calls: number; window_minutes: number };
    if (sli.availability == null) return;
    const windowMs = (sli.window_minutes || 90) * 60000;
    const burned = (windowMs * (1 - sli.availability)) / SLO_ALLOWED_DOWN;
    await env.CI_DB.prepare(
      `INSERT INTO slo_snapshots (window_minutes, availability, p95_ms, p99_ms, total_calls, ok_calls, burned_budget, recorded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(sli.window_minutes, sli.availability, sli.p95_latency_ms, sli.p99_latency_ms, sli.total_calls, sli.ok_calls, burned, Date.now()).run();
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, OPTIONS',
          'access-control-allow-headers': 'content-type, x-issue-token',
        },
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') {
      return json({ status: 'ok', service: 'p31-ci' });
    }

    if (path === '/record' && request.method === 'POST') {
      const token = request.headers.get('x-issue-token');
      if (!env.CI_ISSUE_TOKEN || token !== env.CI_ISSUE_TOKEN) {
        return json({ error: 'unauthorized' }, 401);
      }
      let body: RecordBody;
      try {
        body = (await request.json()) as RecordBody;
      } catch {
        return json({ error: 'invalid json' }, 400);
      }
      if (typeof body.event_type !== 'string' || !ALLOWED_EVENT_TYPES.has(body.event_type)) {
        return json({ error: 'invalid event_type' }, 400);
      }
      if (typeof body.service !== 'string' || body.service.length === 0) {
        return json({ error: 'service required' }, 400);
      }

      const id = `dora-${crypto.randomUUID()}`;
      const createdAt = Date.now();

      await env.CI_DB.prepare(
        `INSERT INTO dora_events (id, event_type, service, commit_sha, actor_did, lead_time_ms, deploy_duration_ms, change_failure, mttr_ms, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          body.event_type,
          body.service,
          body.commit_sha ?? null,
          body.actor_did ?? null,
          body.lead_time_ms ?? null,
          body.deploy_duration_ms ?? null,
          body.change_failure ?? 0,
          body.mttr_ms ?? null,
          createdAt
        )
        .run();

      return json({ ok: true, id });
    }

    if (path === '/metrics' && request.method === 'GET') {
      const service = url.searchParams.get('service') ?? 'all';
      const daysParam = url.searchParams.get('days') ?? '7';
      const days = Number.parseInt(daysParam, 10);
      const safeDays = Number.isFinite(days) && days > 0 ? days : 7;

      const serviceFilter = service !== 'all' ? ' AND service = ?' : '';
      const serviceParams: string[] = service !== 'all' ? [service] : [];

      const now = Date.now();
      const windowStart = now - safeDays * 86_400_000;
      const cfrStart = now - 30 * 86_400_000;

      const deployCountRes = await env.CI_DB.prepare(
        `SELECT COUNT(*) AS n FROM dora_events WHERE event_type = ? AND created_at >= ?${serviceFilter}`
      )
        .bind('deploy_success', windowStart, ...serviceParams)
        .first<{ n: number }>();
      const totalDeploys = deployCountRes?.n ?? 0;

      const cfrTotalRes = await env.CI_DB.prepare(
        `SELECT COUNT(*) AS n FROM dora_events WHERE event_type = ? AND created_at >= ?${serviceFilter}`
      )
        .bind('deploy_success', cfrStart, ...serviceParams)
        .first<{ n: number }>();
      const cfrTotal = cfrTotalRes?.n ?? 0;

      const cfrFailedRes = await env.CI_DB.prepare(
        `SELECT COUNT(*) AS n FROM dora_events WHERE event_type = ? AND change_failure = 1 AND created_at >= ?${serviceFilter}`
      )
        .bind('deploy_success', cfrStart, ...serviceParams)
        .first<{ n: number }>();
      const cfrFailed = cfrFailedRes?.n ?? 0;

      const perDay: Array<{ day: number; deploys: number }> = [];
      for (let i = safeDays - 1; i >= 0; i--) {
        const dayStart = now - i * 86_400_000;
        const dayEnd = dayStart + 86_400_000;
        const row = await env.CI_DB.prepare(
          `SELECT COUNT(*) AS n FROM dora_events WHERE event_type = ? AND created_at >= ? AND created_at < ?${serviceFilter}`
        )
          .bind('deploy_success', dayStart, dayEnd, ...serviceParams)
          .first<{ n: number }>();
        perDay.push({ day: Math.floor(dayStart / 86_400_000), deploys: row?.n ?? 0 });
      }

      const leadRows = await env.CI_DB.prepare(
        `SELECT lead_time_ms FROM dora_events WHERE event_type = ? AND lead_time_ms IS NOT NULL AND created_at >= ?${serviceFilter}`
      )
        .bind('deploy_success', windowStart, ...serviceParams)
        .all<{ lead_time_ms: number }>();
      const leadTimes = (leadRows.results ?? []).map((r) => r.lead_time_ms);

      const mttrRows = await env.CI_DB.prepare(
        `SELECT mttr_ms FROM dora_events WHERE event_type = ? AND mttr_ms IS NOT NULL AND created_at >= ?${serviceFilter}`
      )
        .bind('deploy_success', windowStart, ...serviceParams)
        .all<{ mttr_ms: number }>();
      const mttrTimes = (mttrRows.results ?? []).map((r) => r.mttr_ms);

      const changeFailureRate = cfrTotal > 0 ? cfrFailed / cfrTotal : 0;

      return json({
        metrics: {
          deploy_frequency: { total: totalDeploys, per_day: perDay },
          lead_time: { median: median(leadTimes), p75: p75(leadTimes) },
          change_failure_rate: changeFailureRate,
          mttr: { median: median(mttrTimes) },
        },
        window_days: safeDays,
      });
    }

    if (path === '/events' && request.method === 'GET') {
      const service = url.searchParams.get('service') ?? '';
      const limitParam = url.searchParams.get('limit') ?? '20';
      const limit = Number.parseInt(limitParam, 10);
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 20;

      const serviceFilter = service !== '' ? ' WHERE service = ?' : '';
      const rows = await env.CI_DB.prepare(
        `SELECT id, event_type, service, commit_sha, actor_did, lead_time_ms, deploy_duration_ms, change_failure, mttr_ms, created_at
         FROM dora_events${serviceFilter} ORDER BY created_at DESC LIMIT ?`
      )
        .bind(...(service !== '' ? [service] : []), safeLimit)
        .all<DoraRow>();

      return json({ events: rows.results ?? [] });
    }

    if (path === '/slo' && request.method === 'GET') {
      const snap = await env.CI_DB.prepare('SELECT * FROM slo_snapshots ORDER BY recorded_at DESC LIMIT 1').first();
      if (!snap) return json({ slo: null });
      const burned = Number(snap.burned_budget ?? 0);
      const burnRate = burned >= FAST_BURN ? 'fast' : burned >= SLOW_BURN ? 'slow' : 'ok';
      return json({
        slo: {
          target: SLO_TARGET,
          window_minutes: snap.window_minutes,
          availability: snap.availability,
          p95_ms: snap.p95_ms,
          p99_ms: snap.p99_ms,
          total_calls: snap.total_calls,
          ok_calls: snap.ok_calls,
          error_budget_minutes: Math.round(SLO_ALLOWED_DOWN / 60000),
          burned_budget: burned,
          budget_remaining_pct: Math.max(0, Math.round((1 - burned) * 100)),
          burn_rate: burnRate,
          recorded_at: snap.recorded_at,
        },
      });
    }

    return json({ error: 'not found' }, 404);
  },
};