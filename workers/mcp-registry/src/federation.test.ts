/**
 * federation.test.ts — Lane A (data federation) tests.
 *
 * Covers: official-registry upstream normalization (valid + malformed),
 * hourly KV caching, the negative control (bad upstream payload → log + skip,
 * never throw, never block the P31 catalog), the A-2 merge metadata (source /
 * role / oauth / protocol / approval / priceTier), source filtering, and the
 * upstream call-proxy block. No network required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { __internal } from './index';
import { buildFetch, envWith, kvMock, REMOTE_URL, GOOD_TOOLS, PRICED_TOOLS } from './test-utils';

const {
  handleRequest,
  normalizeOfficialServers,
  priceTierFor,
  fetchOfficialUpstream,
  getFederatedEntries,
  enrichEntry,
} = __internal;

const UPSTREAM_URL = 'https://registry.modelcontextprotocol.io/v0/servers';

const VALID_UPSTREAM = {
  servers: [
    {
      server: { name: 'ac.one/mcp', title: 'One', description: 'desc one', version: '1.0.0', remotes: [{ type: 'streamable-http', url: 'https://one.example/mcp' }] },
      _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: true, updatedAt: '2026-10-01T00:00:00Z' } },
    },
    {
      server: { name: 'ac.one/mcp', title: 'One', description: 'old version', version: '0.9.0', remotes: [{ type: 'streamable-http', url: 'https://one.example/mcp' }] },
      _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: false } },
    },
    {
      server: { name: 'ac.two/mcp', title: 'Two', description: 'desc two', version: '2.0.0', remotes: [{ type: 'streamable-http', url: 'https://two.example/mcp' }], repository: { url: 'https://github.com/x/two', source: 'github' } },
      _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: true, updatedAt: '2026-10-02T00:00:00Z' } },
    },
  ],
};

/** Fetch stub that answers the official registry URL with `upstream()` and
 *  delegates everything else to the standard MCP stub. */
function upstreamFetch(upstream: () => Response, behaviors: Record<string, any> = {}) {
  const base = buildFetch(behaviors);
  return vi.fn(async (url: string | URL, init?: RequestInit) => {
    if (String(url).startsWith('https://registry.modelcontextprotocol.io/')) return upstream();
    return base(String(url), init);
  });
}

function req(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

function registerMock(env: any, behaviors: Record<string, any> = { [REMOTE_URL]: { tools: GOOD_TOOLS } }) {
  return handleRequest(req('https://registry.local/servers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'mock-srv', name: 'Mock Server', endpoint: REMOTE_URL, category: 'crypto', description: 'mock', author: 'QA' }),
  }), env);
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('normalizeOfficialServers', () => {
  it('normalizes a valid payload and dedupes by name preferring isLatest', () => {
    const out = normalizeOfficialServers(VALID_UPSTREAM);
    expect(out).not.toBeNull();
    expect(out!.length).toBe(2);
    const one = out!.find((s) => s.name === 'ac.one/mcp');
    expect(one!.version).toBe('1.0.0'); // isLatest version won, not 0.9.0
    expect(one!.isLatest).toBe(true);
    const two = out!.find((s) => s.name === 'ac.two/mcp');
    expect(two!.repository?.url).toBe('https://github.com/x/two');
    expect(two!.updatedAt).toBe('2026-10-02T00:00:00Z');
  });

  it('returns null for malformed payloads (negative control — never throws)', () => {
    expect(normalizeOfficialServers(null)).toBeNull();
    expect(normalizeOfficialServers('garbage')).toBeNull();
    expect(normalizeOfficialServers({})).toBeNull();
    expect(normalizeOfficialServers({ servers: {} })).toBeNull();
    expect(normalizeOfficialServers({ servers: 'not-an-array' })).toBeNull();
    expect(normalizeOfficialServers({ servers: [{ not: 'server' }] })).toEqual([]);
  });

  it('skips records with missing name or remotes', () => {
    const out = normalizeOfficialServers({
      servers: [
        { server: { description: 'no name', remotes: [{ type: 'http', url: 'https://x' }] } },
        { server: { name: 'ok/one', remotes: [] } },
        { server: { name: 'ok/two', remotes: [{ type: 'streamable-http', url: 'https://y' }] } },
      ],
    });
    expect(out!.map((s) => s.name)).toEqual(['ok/two']);
  });
});

describe('priceTierFor (gateway PRICING mapping)', () => {
  it('maps priced tools to the highest tier present', () => {
    expect(priceTierFor(['phos-adopt', 'brain-dump', 'neo_pixel_control'])).toEqual({ tier: 'premium-high', pricedTools: ['phos-adopt', 'brain-dump', 'neo_pixel_control'] });
    expect(priceTierFor(['neo_pixel_control'])).toEqual({ tier: 'metered-low', pricedTools: ['neo_pixel_control'] });
    expect(priceTierFor(['truth_verify_baseline', 'truth_register_fact'])).toEqual({ tier: 'metered-low', pricedTools: ['truth_verify_baseline', 'truth_register_fact'] });
  });

  it('returns null tier when no tools appear in PRICING', () => {
    expect(priceTierFor(['read_stuff', 'create_thing'])).toEqual({ tier: null, pricedTools: [] });
    expect(priceTierFor([])).toEqual({ tier: null, pricedTools: [] });
  });
});

describe('fetchOfficialUpstream (hourly KV cache + negative control)', () => {
  it('fetches once, caches in KV, and serves the cache on the next call', async () => {
    const upstream = vi.fn(() => new Response(JSON.stringify(VALID_UPSTREAM), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const fetchMock = upstreamFetch(upstream);
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);

    const first = await fetchOfficialUpstream(env);
    expect(first.length).toBe(2);
    expect(upstream.mock.calls.length).toBe(1);

    const second = await fetchOfficialUpstream(env);
    expect(second.length).toBe(2);
    expect(upstream.mock.calls.length).toBe(1); // served from KV — no re-fetch
  });

  it('skips + logs a malformed 200 payload (never throws)', async () => {
    const upstream = vi.fn(() => new Response('{{{"not": "json"', { status: 200, headers: { 'Content-Type': 'application/json' } }));
    const fetchMock = upstreamFetch(upstream);
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);

    const out = await fetchOfficialUpstream(env);
    expect(out).toEqual([]);
    const errors = JSON.parse((await env.REGISTRY_KV.get('errors:events')) ?? '[]');
    expect(errors.some((e: any) => e.source === 'official-registry' && /malformed|failed/i.test(e.message))).toBe(true);
  });

  it('skips + logs a wrong-shaped payload and an HTTP failure', async () => {
    const upstream = vi.fn(() => new Response(JSON.stringify({ servers: { not: 'an array' } }), { status: 200 }));
    const fetchMock = upstreamFetch(upstream);
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);

    expect(await fetchOfficialUpstream(env)).toEqual([]);
    const errors = JSON.parse((await env.REGISTRY_KV.get('errors:events')) ?? '[]');
    expect(errors.some((e: any) => e.source === 'official-registry')).toBe(true);

    // Non-OK status → skip.
    const upstream500 = vi.fn(() => new Response('boom', { status: 500 }));
    const fetchMock2 = upstreamFetch(upstream500);
    vi.stubGlobal('fetch', fetchMock2);
    const env2 = envWith(fetchMock2);
    expect(await fetchOfficialUpstream(env2)).toEqual([]);
    const errors2 = JSON.parse((await env2.REGISTRY_KV.get('errors:events')) ?? '[]');
    expect(errors2.some((e: any) => e.source === 'official-registry' && /HTTP 500/.test(e.message))).toBe(true);
  });
});

describe('A-2 merge — catalog carries governance metadata', () => {
  it('serves upstream listings with source/role/oauth/protocol/approval and P31 entries with source p31', async () => {
    const upstream = vi.fn(() => new Response(JSON.stringify(VALID_UPSTREAM), { status: 200 }));
    const fetchMock = upstreamFetch(upstream);
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);

    const res = await handleRequest(req('https://registry.local/servers'), env);
    expect(res.status).toBe(200);
    const data = await res.json();

    // P31 fleet entry.
    const bros = data.servers.find((s: any) => s.id === 'bros');
    expect(bros).toBeDefined();
    expect(bros.source).toBe('p31');
    expect(bros.approval).toBe('approved');
    expect(bros.protocol).toBe('2026-07-28');
    expect(bros.oauth).toEqual({ enabled: true, resource: 'https://bros.trimtab-signal.workers.dev/mcp', authorization_servers: ['https://oauth-relay.trimtab-signal.workers.dev'] });
    expect(bros.probed).toBe(true);
    expect(bros.priceTier).toBeNull();

    // Upstream reference listings (slug ids from qualified names).
    const one = data.servers.find((s: any) => s.id === 'ac-one-mcp');
    expect(one).toBeDefined();
    expect(one.source).toBe('official');
    expect(one.approval).toBe('pending');
    expect(one.role).toBe('upstream community server');
    expect(one.oauth).toEqual({ enabled: false, resource: null, authorization_servers: [] });
    expect(one.protocol).toBe('streamable-http');
    expect(one.health).toBe('unknown');
    expect(one.probed).toBe(false);
    expect(one.toolCount).toBe(0);
    expect(one.priceTier).toBeNull();
    expect(one.upstream).toEqual({ name: 'ac.one/mcp', version: '1.0.0', repository: null, updatedAt: '2026-10-01T00:00:00Z' });

    const two = data.servers.find((s: any) => s.id === 'ac-two-mcp');
    expect(two.upstream.repository).toBe('https://github.com/x/two');
  });

  it('filters by source', async () => {
    const upstream = vi.fn(() => new Response(JSON.stringify(VALID_UPSTREAM), { status: 200 }));
    const fetchMock = upstreamFetch(upstream);
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);

    const official = await (await handleRequest(req('https://registry.local/servers?source=official'), env)).json();
    expect(official.count).toBe(2);
    expect(official.servers.every((s: any) => s.source === 'official')).toBe(true);

    const p31 = await (await handleRequest(req('https://registry.local/servers?source=p31'), env)).json();
    expect(p31.servers.every((s: any) => s.source === 'p31')).toBe(true);
  });

  it('marks registered servers external + pending and captures the negotiated protocol', async () => {
    const fetchMock = buildFetch({ [REMOTE_URL]: { protocolVersion: '2025-11-25', tools: GOOD_TOOLS } });
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);
    await registerMock(env, { [REMOTE_URL]: { protocolVersion: '2025-11-25', tools: GOOD_TOOLS } });

    const data = await (await handleRequest(req('https://registry.local/servers?source=external'), env)).json();
    const srv = data.servers.find((s: any) => s.id === 'mock-srv');
    expect(srv).toBeDefined();
    expect(srv.source).toBe('external');
    expect(srv.approval).toBe('pending');
    expect(srv.protocol).toBe('2025-11-25');
  });

  it('surfaces priceTier from live-probed tools where the server appears in PRICING', async () => {
    const fetchMock = buildFetch({ [REMOTE_URL]: { tools: PRICED_TOOLS } });
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);
    await handleRequest(req('https://registry.local/servers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'priced-srv', name: 'Priced', endpoint: REMOTE_URL, category: 'finance', description: 'x' }),
    }), env);

    const data = await (await handleRequest(req('https://registry.local/servers?source=external'), env)).json();
    const srv = data.servers.find((s: any) => s.id === 'priced-srv');
    expect(srv.priceTier).toBe('premium-high');
    expect(srv.pricedTools).toEqual(['phos-adopt', 'brain-dump', 'neo_pixel_control']);
  });

  it('blocks proxied calls to upstream reference listings with 403', async () => {
    const upstream = vi.fn(() => new Response(JSON.stringify(VALID_UPSTREAM), { status: 200 }));
    const fetchMock = upstreamFetch(upstream);
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);

    const res = await handleRequest(req('https://registry.local/servers/ac-one-mcp/call', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'x', arguments: {} } }),
    }), env);
    expect(res.status).toBe(403);
    expect((await res.json()).error).toContain('upstream reference listing');
  });

  it('lets a registration take precedence over a same-id upstream listing', async () => {
    // Upstream entry whose slug id collides with the registration id.
    const colliding = { servers: [{ server: { name: 'ctx/x', title: 'Ctx', remotes: [{ type: 'streamable-http', url: 'https://ctx.example/mcp' }] }, _meta: { 'io.modelcontextprotocol.registry/official': { isLatest: true } } }] };
    const fetchMock = buildFetch({ [REMOTE_URL]: { tools: GOOD_TOOLS } });
    const composed = vi.fn(async (url: string | URL, init?: RequestInit) => {
      if (String(url).startsWith('https://registry.modelcontextprotocol.io/')) {
        return new Response(JSON.stringify(colliding), { status: 200 });
      }
      return fetchMock(String(url), init);
    });
    vi.stubGlobal('fetch', composed);
    const env = envWith(composed);

    const reg = await handleRequest(req('https://registry.local/servers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'ctx-x', name: 'My Ctx', endpoint: REMOTE_URL, category: 'crypto', description: 'mine' }),
    }), env);
    expect(reg.status).toBe(201); // not a 409 conflict with the upstream listing

    const data = await (await handleRequest(req('https://registry.local/servers?q=ctx'), env)).json();
    const mine = data.servers.find((s: any) => s.id === 'ctx-x');
    expect(mine.source).toBe('external'); // P31-governed registration wins the merge
    expect(data.servers.filter((s: any) => s.id === 'ctx-x').length).toBe(1);
  });

  it('malformed upstream never breaks the catalog listing (handler-level negative control)', async () => {
    const upstream = vi.fn(() => new Response('<html>not json</html>', { status: 200 }));
    const fetchMock = upstreamFetch(upstream);
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);

    const res = await handleRequest(req('https://registry.local/servers'), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.servers.some((s: any) => s.id === 'p31-crypto')).toBe(true); // P31 catalog intact
    expect(data.servers.every((s: any) => s.source !== 'official')).toBe(true); // nothing malformed leaked in
  });
});

describe('enrichEntry + getFederatedEntries', () => {
  it('enriches a raw entry with defaults and never loses the curated role', async () => {
    const fetchMock = buildFetch({});
    vi.stubGlobal('fetch', fetchMock);
    const env = envWith(fetchMock);
    const federated = await getFederatedEntries(env);
    const shells = federated.filter((e: any) => e.source === 'p31');
    expect(shells.length).toBeGreaterThanOrEqual(20);
    const design = federated.find((e: any) => e.id === 'design-mcp');
    expect(design!.role).toBe('design system');
    expect(design!.oauth.enabled).toBe(false);
    const local = federated.find((e: any) => e.id === 'oasis');
    expect(local!.protocol).toBe('stdio');
    expect(local!.source).toBe('p31');
    expect(local!.approval).toBe('approved');
  });
});