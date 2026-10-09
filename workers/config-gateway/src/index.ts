/**
 * config-gateway — runtime configuration, feature flags, and the usage log.
 *
 * The `trackUsage` sink for the monetization portal (worker.ts posts every
 * request here) and the `usage` surface that renders the Quota/usage UI.
 *
 * Contract (frozen):
 *   GET  /health                    → { status: 'ok' }
 *   GET  /api/config                → { config } (feature flags + workers map)
 *   GET  /api/config/flags          → { flags }
 *   POST /api/config/validate       → { valid, errors? }
 *   GET  /api/usage                 → { total_calls, total_cost_usdc, by_endpoint, by_day }
 *   POST /api/usage/record          → { recorded: true }
 */

export interface Env {
  DB: D1Database;
  ADMIN_TOKEN?: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') return json({ status: 'ok', service: 'config-gateway' });

    if (path === '/api/config') {
      return json({
        config: {
          workers: {
            revenueLedger: 'https://revenue-ledger.trimtab-signal.workers.dev',
            entitlement: 'https://entitlement.trimtab-signal.workers.dev',
            btcpayGateway: 'https://btcpay-gateway.trimtab-signal.workers.dev',
          },
          features: { x402: true, love: true, autoCompound: true, btc: true },
        },
      });
    }

    if (path === '/api/config/flags') {
      return json({ flags: { x402: true, love: true, autoCompound: true, btc: true } });
    }

    if (path === '/api/config/validate' && request.method === 'POST') {
      return json({ valid: true });
    }

    if (path === '/api/usage/record' && request.method === 'POST') {
      try {
        const body = (await request.json()) as { endpoint?: string; method?: string; status?: number; latency_ms?: number };
        await env.DB.prepare(
          'INSERT INTO usage_log (endpoint, method, status, latency_ms, created_at) VALUES (?1, ?2, ?3, ?4, ?5)',
        ).bind(body.endpoint ?? '', body.method ?? '', body.status ?? 0, body.latency_ms ?? 0, Date.now()).run();
        return json({ recorded: true });
      } catch {
        return json({ error: 'bad request' }, 400);
      }
    }

    if (path === '/api/usage') {
      const total = await env.DB.prepare('SELECT COUNT(*) AS c, COALESCE(SUM(latency_ms),0) AS lat FROM usage_log').first<{ c: number; lat: number }>();
      const byEndpoint = await env.DB.prepare(
        'SELECT endpoint, COUNT(*) AS calls FROM usage_log GROUP BY endpoint ORDER BY calls DESC LIMIT 20',
      ).all<{ endpoint: string; calls: number }>();
      const byDay = await env.DB.prepare(
        'SELECT CAST(created_at / 86400000 AS INTEGER) AS day, COUNT(*) AS calls FROM usage_log GROUP BY day ORDER BY day ASC LIMIT 30',
      ).all<{ day: number; calls: number }>();
      return json({
        total_calls: total?.c ?? 0,
        total_cost_usdc: '0',
        avg_latency_ms: total?.c ? Math.round(total.lat / total.c) : 0,
        by_endpoint: byEndpoint.results,
        by_day: byDay.results,
      });
    }

    return json({ error: `not found: ${path}` }, 404);
  },
};