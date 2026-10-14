/**
 * p31-rum — P31 RUM beacon collector (zero-dependency Cloudflare Worker).
 *
 * Privacy contract (non-negotiable): this worker stores ONLY four fields
 * per beacon — metric name, value, page path, unix timestamp. It never
 * reads, logs, or stores cookies, IP addresses, user agents, referrers,
 * or any personal data. There is no request logging of any kind.
 *
 * Endpoints:
 *   POST /collect — JSON array of web-vitals beacons, validated, batched
 *                   into D1 `rum_metrics`. 204 on success.
 *   GET  /summary  — health-check aggregate: count + latest ts + p75 per
 *                   metric name.
 *   GET  /         — plain-language description + privacy contract.
 *
 * Beacon shape (web-vitals v6 style):
 *   [{ name: 'INP'|'LCP'|'CLS'|'TTFB'|'FCP', value: number, page: string,
 *      ts: number }, ...]
 */

// Minimal local typings — this worker has zero deps, so no
// @cloudflare/workers-types. The shapes below are the only D1 surface used.
interface D1Result {
  name?: string;
  n?: number;
  latest_ts?: number;
  p75?: number | null;
  value?: number;
  count?: number;
}
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(col?: string): Promise<T | null>;
}
interface D1Database {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown>;
}
interface Env {
  RUM_DB: D1Database;
}

const ALLOWED_METRICS = new Set(['INP', 'LCP', 'CLS', 'TTFB', 'FCP']);

// The only origins whose pages may report beacons (exact origin prefix).
const ALLOWED_PAGE_PREFIXES = [
  'https://p31ca.org',
  'https://p31-portal-mcp-marketplace.pages.dev',
];

// The only browser origins allowed CORS access on POST /collect.
const ALLOWED_CORS_ORIGINS = new Set([
  'https://p31ca.org',
  'https://p31-portal-mcp-marketplace.pages.dev',
]);

const MAX_BEACONS = 64;
const MAX_BODY_BYTES = 32 * 1024; // 64 beacons ≈ 13 KB; 32 KB is a wide margin.
const TS_TOLERANCE_MS = 60 * 60 * 1000; // ts must be within ±1h of now.

interface Beacon {
  name: string;
  value: number;
  page: string;
  ts: number;
}

function isAllowedPage(page: unknown): page is string {
  return (
    typeof page === 'string' &&
    page.length > 0 &&
    page.length <= 2048 &&
    ALLOWED_PAGE_PREFIXES.some((prefix) => page.startsWith(prefix))
  );
}

function isValidBeacon(item: unknown, now: number): item is Beacon {
  if (typeof item !== 'object' || item === null) return false;
  const b = item as Record<string, unknown>;
  if (typeof b.name !== 'string' || !ALLOWED_METRICS.has(b.name)) return false;
  if (typeof b.value !== 'number' || !Number.isFinite(b.value) || b.value < 0)
    return false;
  if (!isAllowedPage(b.page)) return false;
  if (typeof b.ts !== 'number' || !Number.isFinite(b.ts)) return false;
  if (Math.abs(b.ts - now) > TS_TOLERANCE_MS) return false;
  return true;
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (origin && ALLOWED_CORS_ORIGINS.has(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
  }
  return {};
}

function textResponse(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

const ROOT_TEXT = [
  'P31 RUM collector — real-user-monitoring beacon endpoint for P31 surfaces.',
  '',
  'What it accepts: POST /collect with a JSON array of web-vitals beacons',
  '({name: INP|LCP|CLS|TTFB|FCP, value, page, ts}) from p31ca.org and',
  'p31-portal-mcp-marketplace.pages.dev.',
  '',
  'What it stores: exactly four fields per beacon — metric name, value,',
  'page path, and unix timestamp — in a D1 table. Nothing else.',
  '',
  'What it NEVER stores: no cookies, no IP addresses, no user agents, no',
  'referrers, no personal data of any kind. Requests are not logged.',
  '',
  'Other endpoints: GET /summary (health-check aggregate), GET / (this text).',
  '',
  'Privacy contract: read-only performance measurement. Beacons cannot be',
  'linked to a person or a session; they exist only to keep the site fast.',
].join('\n');

async function handleCollect(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin');
  const cors = corsHeaders(origin);

  // Reject disallowed browser origins outright (non-browser clients send no
  // Origin header and are still validated field-by-field below).
  if (origin && !cors['Access-Control-Allow-Origin']) {
    return textResponse('Origin not allowed', 403);
  }

  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (declared > MAX_BODY_BYTES) {
    return textResponse('Payload too large', 413);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return textResponse('Payload too large', 413);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return textResponse('Invalid JSON body', 400);
  }
  if (!Array.isArray(parsed)) {
    return textResponse('Body must be a JSON array of beacons', 400);
  }
  if (parsed.length === 0 || parsed.length > MAX_BEACONS) {
    return textResponse(
      `Beacon count must be between 1 and ${MAX_BEACONS}`,
      400
    );
  }

  const now = Date.now();
  const beacons: Beacon[] = [];
  for (const item of parsed) {
    if (!isValidBeacon(item, now)) {
      return textResponse(
        'Invalid beacon: name must be INP|LCP|CLS|TTFB|FCP, value a finite ' +
          'non-negative number, page an allowed p31ca.org / p31-portal page, ' +
          'and ts within ±1h of now',
        400
      );
    }
    beacons.push(item as Beacon);
  }

  const statements = beacons.map((b) =>
    env.RUM_DB.prepare(
      'INSERT INTO rum_metrics (name, value, page, ts) VALUES (?, ?, ?, ?)'
    ).bind(b.name, b.value, b.page, b.ts)
  );
  await env.RUM_DB.batch(statements);

  return new Response(null, { status: 204, headers: cors });
}

async function handleSummary(env: Env): Promise<Response> {
  // Health-check aggregate. p75 per metric is computed in JS from a single
  // simple ordered query (SQL window/percentile variants are not available
  // in D1's SQLite; the correlated-OFFSET form fails alias resolution).
  const rows = await env.RUM_DB.prepare(
    'SELECT name, value FROM rum_metrics ORDER BY name, value'
  ).all<D1Result>();
  const total = await env.RUM_DB.prepare(
    'SELECT COUNT(*) AS count, MAX(ts) AS latest_ts FROM rum_metrics'
  ).first<D1Result>();

  const byName = new Map<string, number[]>();
  for (const r of rows.results) {
    if (r.name === undefined || r.value === undefined) continue;
    const list = byName.get(r.name);
    if (list) list.push(r.value);
    else byName.set(r.name, [r.value]);
  }

  const metrics = [...byName.entries()]
    .map(([name, values]) => {
      const idx = Math.max(0, Math.ceil(values.length * 0.75) - 1);
      return { name, count: values.length, p75: values[idx] };
    })
    .sort((a, b) => (a.name < b.name ? -1 : 1));

  return jsonResponse(
    {
      ok: true,
      count: total?.count ?? 0,
      latest_ts: total?.latest_ts ?? null,
      metrics,
    },
    200
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    if (url.pathname === '/collect') {
      if (method === 'OPTIONS') {
        const origin = request.headers.get('Origin');
        const cors = corsHeaders(origin);
        if (!cors['Access-Control-Allow-Origin']) {
          return textResponse('Origin not allowed', 403);
        }
        return new Response(null, { status: 204, headers: cors });
      }
      if (method === 'POST') return handleCollect(request, env);
      return textResponse('Method not allowed', 405);
    }

    if (url.pathname === '/summary') {
      if (method === 'GET') return handleSummary(env);
      return textResponse('Method not allowed', 405);
    }

    if (url.pathname === '/') {
      if (method === 'GET') return textResponse(ROOT_TEXT, 200);
      return textResponse('Method not allowed', 405);
    }

    return textResponse('Not found', 404);
  },
};