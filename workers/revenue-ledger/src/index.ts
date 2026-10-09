/**
 * revenue-ledger — the SHA-256 hash-chained revenue ledger.
 *
 * Every settlement (x402, BTCPay, LOVE) appends an entry whose `hash` is
 * SHA-256(prev_hash + canonical payload). The chain is provably ordered and
 * tamper-evident: `verify-chain` recomputes every hash and confirms linkage.
 *
 * Contract (frozen, mirrored by the monetization portal client + the
 * capital-machine MCP):
 *   GET  /revenue/summary?source=x402&range=30d  → RevenueSummary
 *   GET  /revenue/ledger?limit=500               → { entries: RevenueEntry[] }
 *   GET  /revenue/verify-chain                   → { valid, total_entries, last_hash }
 *   POST /revenue/record  { source, payer_did, merchant_did, amount_usdc,
 *                           asset?, metadata? }  → { entry }
 *   GET  /health                                 → { status: 'ok' }
 */

export interface Env {
  DB: D1Database;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

interface RecordBody {
  source: string;
  payer_did: string;
  merchant_did: string;
  amount_usdc: string;
  asset?: string;
  metadata?: string;
}

async function lastHash(env: Env): Promise<string> {
  const row = await env.DB.prepare('SELECT hash FROM revenue_ledger ORDER BY created_at DESC, id DESC LIMIT 1').first<{ hash: string }>();
  return row?.hash ?? '0000000000000000000000000000000000000000000000000000000000000000';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') return json({ status: 'ok', service: 'revenue-ledger' });

    if (path === '/revenue/record' && request.method === 'POST') {
      try {
        const body = (await request.json()) as RecordBody;
        if (!body.source || !body.amount_usdc) return json({ error: 'source + amount_usdc required' }, 400);
        const prev = await lastHash(env);
        const canonical = JSON.stringify({
          source: body.source,
          payer_did: body.payer_did ?? '',
          merchant_did: body.merchant_did ?? '',
          amount_usdc: body.amount_usdc,
          asset: body.asset ?? 'USDC',
          metadata: body.metadata ?? '',
          prev_hash: prev,
        });
        const hash = await sha256(canonical);
        const now = Date.now();
        const res = await env.DB.prepare(
          `INSERT INTO revenue_ledger (source, payer_did, merchant_did, amount_usdc, asset, metadata, prev_hash, hash, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
        ).bind(body.source, body.payer_did ?? '', body.merchant_did ?? '', body.amount_usdc, body.asset ?? 'USDC', body.metadata ?? '', prev, hash, now).run();
        const id = res.meta.last_row_id;
        return json({ entry: { id, source: body.source, payer_did: body.payer_did ?? '', merchant_did: body.merchant_did ?? '', amount_usdc: body.amount_usdc, asset: body.asset ?? 'USDC', metadata: body.metadata ?? '', prev_hash: prev, hash, created_at: now } });
      } catch {
        return json({ error: 'bad request' }, 400);
      }
    }

    if (path === '/revenue/summary') {
      const source = url.searchParams.get('source') ?? 'x402';
      const range = url.searchParams.get('range') ?? '30d';
      const days = range.endsWith('d') ? parseInt(range) : 30;
      const since = Date.now() - days * 86400000;
      const rows = await env.DB.prepare(
        'SELECT * FROM revenue_ledger WHERE created_at >= ?1 ORDER BY created_at ASC',
      ).bind(since).all<Record<string, unknown>>();
      const entries = rows.results;
      const total = entries.reduce((acc, e) => acc + Number(e.amount_usdc ?? 0), 0);
      const count = entries.length;
      const bySource = new Map<string, { count: number; total_usdc: number }>();
      for (const e of entries) {
        const s = String(e.source ?? 'unknown');
        const row = bySource.get(s) ?? { count: 0, total_usdc: 0 };
        row.count += 1;
        row.total_usdc += Number(e.amount_usdc ?? 0);
        bySource.set(s, row);
      }
      return json({
        total_usdc: total.toFixed(2),
        total_eur: '0',
        total_love: '0',
        total_x402: source === 'x402' ? total.toFixed(2) : undefined,
        count,
        avg_per_transaction: count ? (total / count).toFixed(4) : '0',
        source_breakdown: Object.fromEntries(bySource),
      });
    }

    if (path === '/revenue/ledger') {
      const limit = Math.min(500, Number(url.searchParams.get('limit') ?? 500));
      const rows = await env.DB.prepare(
        'SELECT * FROM revenue_ledger ORDER BY created_at DESC, id DESC LIMIT ?1',
      ).bind(limit).all<Record<string, unknown>>();
      return json({ entries: rows.results });
    }

    if (path === '/revenue/verify-chain') {
      const rows = await env.DB.prepare(
        'SELECT * FROM revenue_ledger ORDER BY created_at ASC, id ASC',
      ).all<Record<string, unknown>>();
      const entries = rows.results;
      let valid = true;
      let prev = '0000000000000000000000000000000000000000000000000000000000000000';
      for (const e of entries) {
        if (String(e.prev_hash) !== prev) { valid = false; break; }
        const canonical = JSON.stringify({
          source: e.source,
          payer_did: e.payer_did ?? '',
          merchant_did: e.merchant_did ?? '',
          amount_usdc: e.amount_usdc,
          asset: e.asset ?? 'USDC',
          metadata: e.metadata ?? '',
          prev_hash: prev,
        });
        const h = await sha256(canonical);
        if (h !== String(e.hash)) { valid = false; break; }
        prev = String(e.hash);
      }
      const last = entries.length ? String(entries[entries.length - 1].hash) : prev;
      return json({ valid, total_entries: entries.length, last_hash: last });
    }

    return json({ error: `not found: ${path}` }, 404);
  },
};