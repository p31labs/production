/**
 * test-utils.ts — shared harness for the marketplace API tests (mocked KV,
 * stubbed edge fetch, D1 mock). No network required. Imported by
 * federation.test.ts + governance-e.test.ts (index.test.ts keeps its own
 * inline copies to avoid churn).
 */
import { vi } from 'vitest';

// ─── In-memory KV mock ──────────────────────────────────────────────────────

export interface KvRecord {
  value: string;
}
export function kvMock() {
  const store = new Map<string, KvRecord>();
  return {
    get: async (k: string) => store.get(k)?.value ?? null,
    put: async (k: string, v: string, _opts?: { expirationTtl?: number }) => {
      store.set(k, { value: v });
    },
    delete: async (k: string) => {
      store.delete(k);
    },
  } as any;
}

// ─── In-memory D1 mock (usage_events upsert + counters) ─────────────────────

export interface UsageRow {
  server: string;
  tool: string;
  count: number;
  last_called: string;
}

export function d1Mock() {
  const rows = new Map<string, UsageRow>();
  const key = (s: string, t: string) => `${s}\u0000${t}`;
  return {
    prepare(sql: string) {
      const build = (...args: unknown[]) => ({
        async run() {
          if (sql.includes('INSERT INTO usage_events')) {
            const [server, tool, count, lastCalled] = args as [string, string, number, string];
            const k = key(server, tool);
            const existing = rows.get(k);
            if (existing) {
              existing.count += count;
              existing.last_called = lastCalled;
            } else {
              rows.set(k, { server, tool, count, last_called: lastCalled });
            }
          }
          return { success: true };
        },
        async all() {
          const list = [...rows.values()].sort((a, b) => b.count - a.count || (a.last_called < b.last_called ? 1 : -1));
          if (sql.includes('WHERE server = ?')) {
            const server = String(args[0] ?? '');
            const limit = Number(args[1] ?? 100);
            return { results: list.filter((r) => r.server === server).slice(0, limit) };
          }
          const limit = Number(args[0] ?? 100);
          return { results: list.slice(0, limit) };
        },
        async first() {
          return { tools: rows.size, calls: [...rows.values()].reduce((a, r) => a + r.count, 0) };
        },
      });
      return { ...build(), bind: (...bindArgs: unknown[]) => build(...bindArgs) };
    },
    _rows: rows,
  } as any;
}

// ─── Stubbed fetch (the edge transport the v2 MCP client uses) ──────────────

export interface MockServerBehavior {
  protocolVersion?: string;
  tools?: Array<{ name: string; description?: string; inputSchema?: object }>;
  callResult?: unknown;
  failInitialize?: boolean;
  failTools?: boolean;
}

/** Normalize a fetch init's headers (Headers instance or plain object) to a plain record. */
export function flatHeaders(init?: RequestInit): Record<string, string> {
  const h = init?.headers;
  if (!h) return {};
  if (h instanceof Headers) return Object.fromEntries([...h.entries()]);
  if (Array.isArray(h)) return Object.fromEntries(h as Array<[string, string]>);
  return { ...(h as Record<string, string>) };
}

/** MCP POSTs must advertise the dual Accept media types (SEP-2243 / 2025 streamable HTTP). */
export function mcpPost(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify(body),
  };
}

export function buildFetch(behaviors: Record<string, MockServerBehavior>) {
  const jsonRes = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  const fn = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const endpoint = String(url);
    const body = JSON.parse(String(init?.body ?? '{}'));
    const method = body?.method;
    const b = behaviors[endpoint] ?? {};
    const isModernServer = b.protocolVersion === '2026-07-28';
    const modernRequest = Boolean(body?.params?._meta?.['io.modelcontextprotocol/protocolVersion']);
    const wrapModern = (result: unknown) => ({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        resultType: 'complete',
        ttlMs: 0,
        cacheScope: 'private',
        _meta: { 'io.modelcontextprotocol/serverInfo': { name: 'mock', version: '1.0.0' } },
        ...(result as Record<string, unknown>),
      },
    });

    if (method === 'server/discover') {
      if (isModernServer) {
        return jsonRes(wrapModern({
          supportedVersions: ['2026-07-28'],
          capabilities: { tools: {} },
        }));
      }
      return jsonRes({
        jsonrpc: '2.0',
        id: body.id,
        result: { protocolVersion: b.protocolVersion ?? '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'mock', version: '1.0.0' } },
      });
    }
    if (method === 'initialize') {
      if (b.failInitialize) {
        return jsonRes({ jsonrpc: '2.0', id: body.id, error: { code: -32603, message: 'boom' } }, 500);
      }
      return jsonRes({
        jsonrpc: '2.0',
        id: body.id,
        result: { protocolVersion: b.protocolVersion ?? '2025-11-25', capabilities: { tools: {} }, serverInfo: { name: 'mock', version: '1.0.0' } },
      });
    }
    if (method === 'notifications/initialized' || method === 'initialized') {
      return new Response(null, { status: 202 });
    }
    if (method === 'tools/list') {
      if (b.failTools) {
        return jsonRes({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: 'Method not found' } }, 400);
      }
      if (isModernServer && modernRequest) {
        return jsonRes(wrapModern({ tools: b.tools ?? [] }));
      }
      return jsonRes({ jsonrpc: '2.0', id: body.id, result: { tools: b.tools ?? [] } });
    }
    if (method === 'tools/call') {
      const result = { content: [{ type: 'text', text: JSON.stringify(b.callResult ?? { ok: true }) }] };
      if (isModernServer && modernRequest) {
        return jsonRes(wrapModern(result));
      }
      return jsonRes({ jsonrpc: '2.0', id: body.id, result });
    }
    return jsonRes({ jsonrpc: '2.0', id: body.id, error: { code: -32601, message: `Method not found: ${method}` } }, 400);
  });
  return fn;
}

export const REMOTE_URL = 'https://mock.example.com/mcp';
export const GOOD_TOOLS = [
  { name: 'read_stuff', description: 'read something', inputSchema: { type: 'object', properties: { q: { type: 'string' } } } },
  { name: 'create_thing', description: 'create a thing', inputSchema: { type: 'object', properties: {} } },
];
export const PRICED_TOOLS = [
  { name: 'phos-adopt', description: 'adopt a file', inputSchema: { type: 'object', properties: {} } },
  { name: 'brain-dump', description: 'elaborate', inputSchema: { type: 'object', properties: {} } },
  { name: 'neo_pixel_control', description: 'led control', inputSchema: { type: 'object', properties: {} } },
];

export function envWith(fetchMock: ReturnType<typeof buildFetch>) {
  return { REGISTRY_KV: kvMock(), MUSIC_MAKER_MCP: undefined } as any;
}

export function govEnvWith(
  fetchMock: ReturnType<typeof buildFetch>,
  opts: { adminSecret?: string | null; usageKey?: string | null; d1?: boolean } = {},
) {
  return {
    REGISTRY_KV: kvMock(),
    MUSIC_MAKER_MCP: undefined,
    USAGE_DB: opts.d1 === false ? undefined : d1Mock(),
    ADMIN_SECRET: opts.adminSecret === null ? undefined : (opts.adminSecret ?? 'test-admin-secret'),
    INTERNAL_USAGE_KEY: opts.usageKey === null ? undefined : (opts.usageKey ?? 'test-usage-key'),
  } as any;
}