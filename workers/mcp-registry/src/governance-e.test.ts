/**
 * governance-e.test.ts — Lane E (registry-side enterprise governance) tests.
 *
 * Covers: the admin-secret approval gate (POST /servers/:id/approve,
 * unauthenticated → 403, wrong secret → 403, block/pending actions, SIEM
 * audit fields), the bridge usage contract (POST /internal/usage with
 * X-Internal-Usage-Key, D1 upsert), GET /analytics/tools (admin secret), and
 * the approval state visible on catalog entries. No network required.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { __internal } from './index';
import { buildFetch, govEnvWith, kvMock, d1Mock, REMOTE_URL, GOOD_TOOLS } from './test-utils';

const { handleRequest } = __internal;

const SECRET = { headers: { 'X-Admin-Secret': 'test-admin-secret' } };
const USAGE_KEY = { headers: { 'X-Internal-Usage-Key': 'test-usage-key' } };

function req(url: string, init?: RequestInit): Request {
  return new Request(url, init);
}

function registerMock(env: any) {
  return handleRequest(req('https://registry.local/servers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'mock-srv', name: 'Mock Server', endpoint: REMOTE_URL, category: 'crypto', description: 'mock', author: 'QA' }),
  }), env);
}

function fetchEnv() {
  const fetchMock = buildFetch({ [REMOTE_URL]: { tools: GOOD_TOOLS } });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('E-1 approval gate: POST /servers/:id/approve', () => {
  it('answers 503 when ADMIN_SECRET is not configured (gate closed, never open)', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock, { adminSecret: null });
    const res = await handleRequest(req('https://registry.local/servers/anything/approve', {
      method: 'POST', headers: { ...SECRET.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    }), env);
    expect(res.status).toBe(503);
  });

  it('rejects unauthenticated approve with 403 (negative control)', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);
    await registerMock(env);

    const res = await handleRequest(req('https://registry.local/servers/mock-srv/approve', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    }), env);
    expect(res.status).toBe(403);

    const wrong = await handleRequest(req('https://registry.local/servers/mock-srv/approve', {
      method: 'POST', headers: { 'X-Admin-Secret': 'nope', 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    }), env);
    expect(wrong.status).toBe(403);

    // Approval state unchanged.
    const data = await (await handleRequest(req('https://registry.local/servers?source=external'), env)).json();
    expect(data.servers.find((s: any) => s.id === 'mock-srv').approval).toBe('pending');
  });

  it('approves with the shared secret and records a SIEM audit event', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);
    await registerMock(env);

    const res = await handleRequest(req('https://registry.local/servers/mock-srv/approve', {
      method: 'POST', headers: { ...SECRET.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'approve' }),
    }), env);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.approval).toBe('approved');
    expect(body.status).toBe('live');

    // Catalog entry carries the flip.
    const data = await (await handleRequest(req('https://registry.local/servers?source=external'), env)).json();
    const srv = data.servers.find((s: any) => s.id === 'mock-srv');
    expect(srv.approval).toBe('approved');
    expect(srv.status).toBe('live');

    // SIEM audit fields: timestamp + identity + server + outcome.
    const t = await (await handleRequest(req('https://registry.local/transparency'), env)).json();
    const ev = t.events.find((e: any) => e.serverId === 'mock-srv' && e.event === 'approved');
    expect(ev).toBeDefined();
    expect(ev.principal).toBe('admin-secret');
    expect(ev.outcome).toBe('approved');
    expect(ev.ts).toBeDefined();
  });

  it('honors an explicit X-Principal identity in the audit event', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);
    await registerMock(env);

    const res = await handleRequest(req('https://registry.local/servers/mock-srv/approve', {
      method: 'POST', headers: { ...SECRET.headers, 'X-Principal': 'will@p31', 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    }), env);
    expect(res.status).toBe(200);
    const t = await (await handleRequest(req('https://registry.local/transparency'), env)).json();
    expect(t.events.some((e: any) => e.event === 'approved' && e.principal === 'will@p31')).toBe(true);
  });

  it('blocks and un-approves (pending) through the gate', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);
    await registerMock(env);

    const blocked = await handleRequest(req('https://registry.local/servers/mock-srv/approve', {
      method: 'POST', headers: { ...SECRET.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'block' }),
    }), env);
    const blockedBody = await blocked.json();
    expect(blockedBody.approval).toBe('blocked');
    expect(blockedBody.status).toBe('down');

    const data = await (await handleRequest(req('https://registry.local/servers?source=external'), env)).json();
    expect(data.servers.find((s: any) => s.id === 'mock-srv').approval).toBe('blocked');

    const pending = await handleRequest(req('https://registry.local/servers/mock-srv/approve', {
      method: 'POST', headers: { ...SECRET.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pending' }),
    }), env);
    expect((await pending.json()).approval).toBe('pending');
  });

  it('404s for unknown ids and 400s for a bad action', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);

    const missing = await handleRequest(req('https://registry.local/servers/ghost/approve', {
      method: 'POST', headers: { ...SECRET.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    }), env);
    expect(missing.status).toBe(404);

    const bad = await handleRequest(req('https://registry.local/servers/p31-crypto/approve', {
      method: 'POST', headers: { ...SECRET.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'yeet' }),
    }), env);
    expect(bad.status).toBe(400); // fleet entries are not approvable via the community gate
  });

  it('only operates on registered community entries — fleet entries 404', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);
    const res = await handleRequest(req('https://registry.local/servers/bros/approve', {
      method: 'POST', headers: { ...SECRET.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    }), env);
    expect(res.status).toBe(404);
  });
});

describe('E-2 usage counters: POST /internal/usage + GET /analytics/tools', () => {
  it('rejects usage POSTs without the internal key (negative control)', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);

    expect((await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping' }),
    }), env)).status).toBe(403);

    expect((await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { 'X-Internal-Usage-Key': 'wrong', 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping' }),
    }), env)).status).toBe(403);
  });

  it('upserts {server, tool, count, last_called} into D1 per the bridge contract', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);

    const res = await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping' }),
    }), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, server: 'bros', tool: 'ping', count: 1 });

    // Second POST increments the same counter (upsert, not insert).
    await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping' }),
    }), env);
    await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'dads', tool: 'task_verify' }),
    }), env);

    const row = env.USAGE_DB._rows.get('bros\u0000ping');
    expect(row.count).toBe(2);
    expect(row.last_called).toBeDefined();

    // Optional count override is honored (contract minimum is {server, tool}).
    await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping', count: 5 }),
    }), env);
    expect(env.USAGE_DB._rows.get('bros\u0000ping').count).toBe(7);
  });

  it('400s when server or tool is missing', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);
    const res = await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros' }),
    }), env);
    expect(res.status).toBe(400);
  });

  it('serves counters via GET /analytics/tools behind the admin secret', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);

    // Unauthenticated analytics read → 403.
    expect((await handleRequest(req('https://registry.local/analytics/tools'), env)).status).toBe(403);
    expect((await handleRequest(req('https://registry.local/analytics/tools', { headers: { 'X-Admin-Secret': 'nope' } }), env)).status).toBe(403);

    await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping' }),
    }), env);
    await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping' }),
    }), env);

    const res = await handleRequest(req('https://registry.local/analytics/tools', SECRET), env);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.totals).toEqual({ tools: 1, calls: 2 });
    expect(data.tools).toHaveLength(1);
    expect(data.tools[0]).toMatchObject({ server: 'bros', tool: 'ping', count: 2 });

    // Admin read is SIEM-audited (usage-admin event).
    const t = await (await handleRequest(req('https://registry.local/transparency'), env)).json();
    expect(t.events.some((e: any) => e.event === 'usage-admin' && e.principal === 'admin-secret' && e.outcome === 'ok')).toBe(true);
  });

  it('filters analytics by server', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);
    await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping' }),
    }), env);
    await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'dads', tool: 'task_verify' }),
    }), env);

    const data = await (await handleRequest(req('https://registry.local/analytics/tools?server=dads', SECRET), env)).json();
    expect(data.tools).toHaveLength(1);
    expect(data.tools[0].server).toBe('dads');
  });

  it('degrades to 503 when D1 is unbound (never crashes)', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock, { d1: false });
    expect((await handleRequest(req('https://registry.local/internal/usage', {
      method: 'POST', headers: { ...USAGE_KEY.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ server: 'bros', tool: 'ping' }),
    }), env)).status).toBe(503);
    expect((await handleRequest(req('https://registry.local/analytics/tools', SECRET), env)).status).toBe(503);
  });
});

describe('E-1 approval state on the public catalog', () => {
  it('p31 fleet entries are approved; registered entries start pending', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock);
    await registerMock(env);

    const data = await (await handleRequest(req('https://registry.local/servers'), env)).json();
    expect(data.servers.find((s: any) => s.id === 'p31-crypto').approval).toBe('approved');
    expect(data.servers.find((s: any) => s.id === 'mock-srv').approval).toBe('pending');
  });

  it('the existing review flow also flips approval to approved', async () => {
    const fetchMock = fetchEnv();
    const env = govEnvWith(fetchMock, {});
    env.ADMIN_TOKEN = 'test-admin-token';
    await registerMock(env);

    const res = await handleRequest(req('https://registry.local/servers/mock-srv/review', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-admin-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    }), env);
    expect(res.status).toBe(200);

    const data = await (await handleRequest(req('https://registry.local/servers?source=external'), env)).json();
    expect(data.servers.find((s: any) => s.id === 'mock-srv').approval).toBe('approved');
  });
});