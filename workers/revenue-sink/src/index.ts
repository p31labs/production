/**
 * revenue-sink — the connective tissue for every income avenue.
 *
 * Any layer (bottom feeders, content, x402, grants) pushes a typed entry to
 * POST /api/push. The sink records it locally in D1 AND forwards to the
 * hash-chained revenue ledger (revenue-ledger /revenue/record), so one summary
 * shows total inflow across every avenue.
 *
 * Typed sources (validated prefixes):
 *   depin/honeygain, depin/pawns, depin/earnapp, depin/packetstream,
 *   depin/storj, depin/grass, depin/nodepay, depin/render, depin/clore,
 *   content/devto, content/bluesky, content/hashnode,
 *   x402/tool-call, x402/routing-fee,
 *   grants/nlnet, grants/interledger, grants/base-builder, grants/gecko,
 *   grants/nsf-pesose, grants/digital-science, grants/iotex-halo,
 *   grants/oort, grants/tether
 *
 * Auth: POST /api/push requires header `x-sink-token: <SINK_TOKEN>`.
 */
export interface Env {
  SINK_DB: D1Database;
  SINK_TOKEN?: string;
  /** Service binding to revenue-ledger (preferred over public URL fetch). */
  REVENUE_LEDGER?: Fetcher;
  /** Display/fallback only — public workers.dev subrequest fails on this account. */
  REVENUE_LEDGER_URL?: string;
}

const ALLOWED_PREFIXES = ['depin/', 'content/', 'x402/', 'grants/'] as const;

interface PushBody {
  source: string;
  amount_usdc: string;
  asset?: string;
  payer_did?: string;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-sink-token',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...CORS },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (url.pathname === '/health') {
      let ledger_probe: string | null = null;
      if (env.REVENUE_LEDGER) {
        try {
          const lp = await env.REVENUE_LEDGER.fetch(new Request('https://revenue-ledger.internal/health'));
          ledger_probe = `${lp.status} ${(await lp.text()).slice(0, 60)}`;
        } catch (e) {
          ledger_probe = `ERR:${e instanceof Error ? e.message.slice(0, 80) : String(e)}`;
        }
      }
      return json({ status: 'ok', service: 'revenue-sink', ledger_url: env.REVENUE_LEDGER_URL ?? null, ledger_probe, timestamp: Date.now() });
    }

    if (url.pathname === '/api/push' && request.method === 'POST') {
      const token = request.headers.get('x-sink-token');
      if (!env.SINK_TOKEN || token !== env.SINK_TOKEN) {
        return json({ error: 'unauthorized' }, 401);
      }

      let body: PushBody;
      try {
        body = (await request.json()) as PushBody;
      } catch {
        return json({ error: 'invalid json' }, 400);
      }

      if (!body.source || typeof body.source !== 'string') return json({ error: 'source required' }, 400);
      if (!ALLOWED_PREFIXES.some((p) => body.source.startsWith(p))) {
        return json({ error: `source must start with: ${ALLOWED_PREFIXES.join(', ')}` }, 400);
      }
      if (body.amount_usdc === undefined || isNaN(parseFloat(body.amount_usdc))) {
        return json({ error: 'amount_usdc must be a numeric string' }, 400);
      }

      const id = `sink-${crypto.randomUUID()}`;
      const now = Date.now();
      const metadata = JSON.stringify(body.metadata ?? {});

      await env.SINK_DB.prepare(
        `INSERT INTO sink_entries (id, source, amount_usdc, asset, payer_did, external_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, body.source, body.amount_usdc, body.asset ?? 'USDC', body.payer_did ?? null, body.external_id ?? null, metadata, now).run();

      // Forward to the hash-chained revenue ledger via service binding (observable).
      let ledgerStatus: number | string = 'skipped';
      const ledgerRecord = {
        source: body.source,
        payer_did: body.payer_did ?? `did:sink:${body.source}`,
        merchant_did: 'did:web:p31ca.org',
        amount_usdc: body.amount_usdc,
        asset: body.asset ?? 'USDC',
        metadata: { sink_entry: id, external_id: body.external_id ?? undefined, ...body.metadata },
      };
      if (env.REVENUE_LEDGER) {
        try {
          const lr = await env.REVENUE_LEDGER.fetch(new Request('https://revenue-ledger.internal/revenue/record', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ledgerRecord),
          }));
          ledgerStatus = `${lr.status} ${(await lr.text()).slice(0, 120)}`;
        } catch (e) {
          ledgerStatus = `ERR:${e instanceof Error ? e.message.slice(0, 80) : String(e)}`;
        }
      }

      return json({ ok: true, id, source: body.source, ledger_status: ledgerStatus });
    }

    if (url.pathname === '/api/summary' && request.method === 'GET') {
      const rows = await env.SINK_DB.prepare(
        `SELECT source, COUNT(*) as count, SUM(CAST(amount_usdc AS REAL)) as total
         FROM sink_entries GROUP BY source ORDER BY total DESC`,
      ).all<{ source: string; count: number; total: number }>();
      const grand = (rows.results ?? []).reduce((s, r) => s + (r.total ?? 0), 0);
      return json({ total_usdc: grand.toFixed(6), by_source: rows.results ?? [] });
    }

    if (url.pathname === '/api/entries' && request.method === 'GET') {
      const limit = Math.min(Number(url.searchParams.get('limit') ?? '50'), 200);
      const rows = await env.SINK_DB.prepare(
        `SELECT * FROM sink_entries ORDER BY created_at DESC LIMIT ?`,
      ).bind(limit).all();
      return json({ entries: rows.results ?? [] });
    }

    return json({ error: 'not found' }, 404);
  },
};