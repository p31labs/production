/**
 * Access gate tests — the service-token principal path (Lumi's server-side
 * writes) plus the fail-closed behavior for unauthenticated requests.
 */

import { describe, it, expect } from 'vitest';
import { accessGate, type AccessEnv } from '../../functions/api/loom/_lib/access';

type MockContext = Parameters<typeof accessGate>[0];

function makeContext(over: Partial<{
  env: Partial<AccessEnv>;
  headers: Record<string, string>;
  url: string;
  data: Record<string, unknown>;
}> = {}): MockContext {
  const env = {
    CLOUDFLARE_ACCESS_DOMAIN: 'https://p31ca.cloudflareaccess.com',
    CLOUDFLARE_ACCESS_AUD: '632d76e19a37300f679ccf97a8ca366baf3f324868ad2e5b23118b8ae40c1ffa',
    CF_ACCESS_CLIENT_ID: '59a1cac566edc31619828e2da39256d3.access',
    CF_ACCESS_CLIENT_SECRET: 'cfast_test-secret',
    ...over.env,
  } as AccessEnv;
  const headers = new Headers();
  for (const [k, v] of Object.entries(over.headers ?? {})) headers.set(k, v);
  return {
    request: new Request(over.url ?? 'https://loom-8z0.pages.dev/api/loom/event', { method: 'POST', headers }),
    env,
    data: over.data ?? {},
    next: async () => new Response('next', { status: 200 }),
  } as unknown as MockContext;
}

describe('accessGate', () => {
  it('accepts a matching service token as a service principal', async () => {
    const ctx = makeContext({ headers: {
      'CF-Access-Client-Id': '59a1cac566edc31619828e2da39256d3.access',
      'CF-Access-Client-Secret': 'cfast_test-secret',
    }});
    const res = await accessGate(ctx);
    expect(res.status).toBe(200);
    const access = (ctx.data as { access: { payload: Record<string, unknown> } }).access;
    expect(access.payload.sub).toBe('service:59a1cac566edc31619828e2da39256d3.access');
    expect(access.payload.service).toBe(true);
  });

  it('rejects a mismatched service token (no JWT falls through to 401)', async () => {
    const ctx = makeContext({ headers: {
      'CF-Access-Client-Id': 'wrong.access',
      'CF-Access-Client-Secret': 'wrong',
    }});
    const res = await accessGate(ctx);
    expect(res.status).toBe(401);
  });

  it('rejects an unauthenticated non-localhost request (fail-closed)', async () => {
    const ctx = makeContext({ url: 'https://loom-8z0.pages.dev/api/loom/events' });
    const res = await accessGate(ctx);
    expect(res.status).toBe(401);
  });

  it('allows localhost through (wrangler pages dev has no Access in the loop)', async () => {
    const ctx = makeContext({ url: 'http://localhost:8788/api/loom/events' });
    const res = await accessGate(ctx);
    expect(res.status).toBe(200);
  });

  it('fails open only when the AUD is still a placeholder (interim posture)', async () => {
    const ctx = makeContext({ env: { CLOUDFLARE_ACCESS_AUD: 'REPLACE_WITH_ACCESS_AUD' } });
    const res = await accessGate(ctx);
    expect(res.status).toBe(200);
  });

  it('rejects a length-mismatched secret via the constant-time path', async () => {
    // Mismatched-length secrets must still go through the constant-time
    // comparison (no early return leaks the secret length).
    const ctx = makeContext({ headers: {
      'CF-Access-Client-Id': '59a1cac566edc31619828e2da39256d3.access',
      'CF-Access-Client-Secret': 'short',
    }});
    const res = await accessGate(ctx);
    expect(res.status).toBe(401);
  });
});