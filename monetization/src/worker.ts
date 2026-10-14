import { signRoleToken, verifyRoleToken, hasRole, ROLE_LEVEL, ROLE_TTL_SECONDS, type Role, type RoleToken } from './roles';
import { PasskeyError, generateLoginOptions, generateRegisterOptions, setPasskeyStore, verifyLogin, verifyRegister } from './lib/passkeys';
import { verifyAccessJwt, type AccessJwtIdentity } from './lib/accessJwt';
import {
  signRoleTokenOAuth21,
  verifyRoleTokenOAuth21,
  decodeRoleTokenOAuth21,
  isOAuth21Enabled,
} from './lib/oauth21';
import { createD1PasskeyStore } from './lib/passkeyStore';
import { createOAuthSessionStore } from './lib/oauthSessionStore';
import type { D1Database } from './lib/d1Types';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
}

interface Env {
  ASSETS: any;
  REVENUE_LEDGER: any;
  ENTITLEMENT: any;
  AUTO_COMPOUNDER: any;
  MEV_ARBITRAGE: any;
  YIELD_VAULT: any;
  ALLOCATOR: any;
  CONFIG_GATEWAY: any;
  BTCPAY_GATEWAY: any;
  /** p31-sbt worker (service binding) — soulbound-token registry + anchoring. */
  SBT_GATEWAY: any;
  /** p31-ci worker (service binding) — DORA metrics + CI events. */
  DORA_GATEWAY: any;
  /** HS256 secret for role tokens (set via `wrangler secret put ROLE_JWT_SECRET`). */
  ROLE_JWT_SECRET?: string;
  /** Admin token for role-token issuance (set via `wrangler secret put ADMIN_TOKEN`). */
  ADMIN_TOKEN?: string;
  /** Shared token forwarded to p31-sbt for SBT issuance (set via `wrangler secret put SBT_ISSUE_TOKEN`). */
  SBT_ISSUE_TOKEN?: string;
  /** Cloudflare Access team domain (e.g. "trimtab"). When set, a valid `Cf-Access-Jwt-Assertion` is accepted as an RBAC grant. Set via `wrangler secret put ZERO_TRUST_TEAM_DOMAIN`. */
  ZERO_TRUST_TEAM_DOMAIN?: string;
  /** D1 binding for passkey persistence + OAuth session state (docs/ZERO-TRUST.md §4). */
  AUTH_DB?: D1Database;
  /** Feature flag — when 'true', issues/verifies RFC 8707 audience-bound OAuth 2.1 role tokens (src/lib/oauth21.ts). */
  OAUTH21_ENABLED?: string;
}

/** Bound once per isolate — the D1 passkey store is recreated only when absent. */
let d1PasskeyStoreBound = false;

/**
 * Record an OAuth 2.1 role-token issuance in D1 (audit/session state,
 * docs/ZERO-TRUST.md §4). Fire-and-forget via waitUntil — never blocks or
 * fails the auth path.
 */
function recordOAuth21Issuance(env: Env, ctx: ExecutionContext, token: string, did: string, role: Role, aud: string) {
  if (!env.AUTH_DB) return;
  const jti = decodeRoleTokenOAuth21(token)?.jti;
  if (!jti) return;
  const now = Math.floor(Date.now() / 1000);
  ctx.waitUntil(
    createOAuthSessionStore(env.AUTH_DB)
      .record({ jti, did, role, aud, issuedAt: now, expiresAt: now + ROLE_TTL_SECONDS[role] })
      .catch(() => {}),
  );
}

/** Write routes requiring at least the operator role. */
const OPERATOR_ROUTES = new Set([
  'btcpay/sweep',
  'btcpay/invoice',
  'allocator/rebalance',
  'auto-compounder/compound',
  'mev-arbitrage/execute',
  'sbt/issue',
]);

/** Write routes requiring the admin role. */
const ADMIN_ROUTES = new Set([
  'config',
  'config/validate',
  'entitlement/tier-set',
  'love/issue',
]);

const routes: Record<string, { service: keyof Env; path: string }> = {
  'revenue/summary': { service: 'REVENUE_LEDGER', path: '/revenue/summary' },
  'revenue/ledger': { service: 'REVENUE_LEDGER', path: '/revenue/ledger' },
  'revenue/verify-chain': { service: 'REVENUE_LEDGER', path: '/revenue/verify-chain' },
  'entitlement/check': { service: 'ENTITLEMENT', path: '/entitlement/check' },
  'entitlement/tier-set': { service: 'ENTITLEMENT', path: '/entitlement/tier-set' },
  'love/issue': { service: 'ENTITLEMENT', path: '/love/issue' },
  'auto-compounder/positions': { service: 'AUTO_COMPOUNDER', path: '/positions' },
  'mev-arbitrage/opportunities': { service: 'MEV_ARBITRAGE', path: '/opportunities' },
  'yield-vault/stats': { service: 'YIELD_VAULT', path: '/stats' },
  'allocator/health': { service: 'ALLOCATOR', path: '/health' },
  'allocator/rebalance': { service: 'ALLOCATOR', path: '/rebalance' },
  'auto-compounder/compound': { service: 'AUTO_COMPOUNDER', path: '/compound' },
  'mev-arbitrage/execute': { service: 'MEV_ARBITRAGE', path: '/execute' },
  'config': { service: 'CONFIG_GATEWAY', path: '/api/config' },
  'config/validate': { service: 'CONFIG_GATEWAY', path: '/api/config/validate' },
  'config/flags': { service: 'CONFIG_GATEWAY', path: '/api/config/flags' },
  'usage': { service: 'CONFIG_GATEWAY', path: '/api/usage' },
  'btcpay/invoice': { service: 'BTCPAY_GATEWAY', path: '/invoice' },
  'btcpay/invoices': { service: 'BTCPAY_GATEWAY', path: '/invoices' },
  'btcpay/stores': { service: 'BTCPAY_GATEWAY', path: '/stores' },
  'btcpay/donations': { service: 'BTCPAY_GATEWAY', path: '/donations' },
  'btcpay/sweep': { service: 'BTCPAY_GATEWAY', path: '/sweep' },
  'sbt/issue': { service: 'SBT_GATEWAY', path: '/issue' },
  'sbt/list': { service: 'SBT_GATEWAY', path: '/list' },
  'sbt/verify': { service: 'SBT_GATEWAY', path: '/verify' },
  'dora/metrics': { service: 'DORA_GATEWAY', path: '/metrics' },
  'slo/metrics': { service: 'DORA_GATEWAY', path: '/slo' },
};

/** SSE surface → backend service + path. Event name = surface key. */
const STREAM_SOURCES: Record<string, { service: keyof Env; path: string; query: string }> = {
  revenue: { service: 'REVENUE_LEDGER', path: '/revenue/summary', query: '?source=x402&range=30d' },
  positions: { service: 'AUTO_COMPOUNDER', path: '/positions', query: '' },
  opportunities: { service: 'MEV_ARBITRAGE', path: '/opportunities', query: '?status=pending' },
};

const SSE_HEARTBEAT_MS = 5000;

/** Runtime invariant checks — the machine asserts its own invariants every poll. */
async function checkInvariants(env: Env): Promise<{ invariants: { name: string; status: 'ok' | 'fail'; detail: string }[]; healthy: boolean }> {
  const probe = (service: keyof Env, url: string, headers?: Headers) =>
    env[service].fetch(new Request(url, { headers })).then((r: Response) => r.text());

  const [chain, allocator, config] = await Promise.allSettled([
    probe('REVENUE_LEDGER', 'https://revenue-ledger.local/revenue/verify-chain', new Headers({ Accept: 'application/json' })),
    probe('ALLOCATOR', 'https://capital-allocator.local/health', new Headers({ Accept: 'application/json' })),
    probe('CONFIG_GATEWAY', 'https://config-gateway.local/health', new Headers({ Accept: 'application/json' })),
  ]);

  const invariants = [
    {
      name: 'revenue.hash_chain',
      status: (chain.status === 'fulfilled' && chain.value.includes('"valid":true')) ? 'ok' as const : 'fail' as const,
      detail: chain.status === 'fulfilled' ? chain.value.slice(0, 120) : 'unreachable',
    },
    {
      name: 'allocator.healthy',
      status: (allocator.status === 'fulfilled' && allocator.value.includes('"status":"ok"')) ? 'ok' as const : 'fail' as const,
      detail: allocator.status === 'fulfilled' ? allocator.value.slice(0, 120) : 'unreachable',
    },
    {
      name: 'config.reachable',
      status: config.status === 'fulfilled' ? 'ok' as const : 'fail' as const,
      detail: config.status === 'fulfilled' ? 'reachable' : 'unreachable',
    },
  ];

  return { invariants, healthy: invariants.every((i) => i.status === 'ok') };
}

/**
 * Server-Sent Events stream: polls the requested backend surfaces on a 5s
 * heartbeat and pushes `event: <surface>` frames with the raw JSON payload.
 * Client disconnect (request.signal) tears the stream down.
 */
function buildSseStream(request: Request, env: Env, sources: { name: string; service: keyof Env; path: string; query: string }[]) {
  const encoder = new TextEncoder();
  let closed = false;

  return new ReadableStream({
    start(controller) {
      const heartbeat = () => {
        void Promise.all(
          sources.map(async ({ name, service, path, query }) => {
            try {
              const proxy = new Request(`https://${service.toLowerCase()}.trimtab-signal.workers.dev${path}${query}`, {
                headers: { Accept: 'application/json' },
              });
              const res = await env[service].fetch(proxy);
              if (!res.ok) return;
              const text = await res.text();
              if (!closed) controller.enqueue(encoder.encode(`event: ${name}\ndata: ${text}\n\n`));
            } catch {
              // skip a failed surface; retry on next heartbeat
            }
          }),
        ).then(() => {
          if (!closed) controller.enqueue(encoder.encode(': keep-alive\n\n'));
        });
      };

      const timer = setInterval(heartbeat, SSE_HEARTBEAT_MS);

      heartbeat();

      request.signal.addEventListener('abort', () => {
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
  });
}

function trackUsage(env: Env, ctx: ExecutionContext, endpoint: string, method: string, status: number, latencyMs: number) {
  ctx.waitUntil(
    env.CONFIG_GATEWAY.fetch(
      new Request('https://config-gateway.local/api/usage/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, method, status, latency_ms: latencyMs }),
      })
    ).catch(() => {})
  );
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function webauthnError(error: unknown): Response {
  if (error instanceof PasskeyError) {
    return jsonResponse({ error: error.message }, error.status);
  }
  return jsonResponse({ error: error instanceof Error ? error.message : 'webauthn failure' }, 400);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Bind the durable passkey store once the AUTH_DB binding exists
    // (docs/ZERO-TRUST.md §Passkey persistence → D1).
    if (env.AUTH_DB && !d1PasskeyStoreBound) {
      setPasskeyStore(createD1PasskeyStore(env.AUTH_DB));
      d1PasskeyStoreBound = true;
    }

    if (url.pathname.startsWith('/api/')) {
      if (url.pathname === '/api/stream') {
        const names = (url.searchParams.get('surfaces') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
        const sources = names.filter((n) => STREAM_SOURCES[n]).map((name) => ({ name, ...STREAM_SOURCES[name] }));
        if (sources.length === 0) {
          return new Response('stream: no valid surfaces (revenue|positions|opportunities)', {
            status: 400,
            headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
          });
        }
        const stream = buildSseStream(request, env, sources);
        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (url.pathname === '/api/health/invariants') {
        const result = await checkInvariants(env);
        return new Response(JSON.stringify(result), {
          status: result.healthy ? 200 : 503,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      if (url.pathname === '/api/auth/token' && request.method === 'POST') {
        const adminToken = request.headers.get('X-Admin-Token');
        if (!env.ADMIN_TOKEN || adminToken !== env.ADMIN_TOKEN) {
          return new Response(JSON.stringify({ error: 'admin token required (X-Admin-Token)' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
        try {
          const body = (await request.json()) as { did?: string; role?: string };
          const did = body.did ?? '';
          const role = (body.role ?? 'viewer') as Role;
          if (!did) return new Response(JSON.stringify({ error: 'did required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          if (!(role in ROLE_LEVEL)) return new Response(JSON.stringify({ error: `unknown role: ${role}` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          if (!env.ROLE_JWT_SECRET) return new Response(JSON.stringify({ error: 'ROLE_JWT_SECRET not configured' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

          // OAuth 2.1 / RFC 8707: when enabled, bind the token's `aud` to the
          // requesting origin and record the issuance in D1 (docs/ZERO-TRUST.md §4).
          const oauth21 = isOAuth21Enabled(env.OAUTH21_ENABLED);
          const aud = url.origin;
          const token = oauth21
            ? await signRoleTokenOAuth21(env.ROLE_JWT_SECRET, did, role, aud)
            : await signRoleToken(env.ROLE_JWT_SECRET, did, role);
          if (oauth21) recordOAuth21Issuance(env, ctx, token, did, role, aud);

          return new Response(
            JSON.stringify({ token, did, role, ttl: ROLE_TTL_SECONDS[role], ...(oauth21 ? { token_type: 'Bearer', aud } : {}) }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            },
          );
        } catch {
          return new Response(JSON.stringify({ error: 'bad request' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
      }

      // Passkey (WebAuthn) registration — bind a credential to a did:key.
      if (url.pathname === '/api/webauthn/register/options' && request.method === 'POST') {
        try {
          const body = (await request.json()) as { did?: string; username?: string };
          if (!body.did) return jsonResponse({ error: 'did required' }, 400);
          const options = await generateRegisterOptions(request, { did: body.did, username: body.username });
          return jsonResponse(options);
        } catch (error) {
          return webauthnError(error);
        }
      }

      if (url.pathname === '/api/webauthn/register/verify' && request.method === 'POST') {
        try {
          const body = (await request.json()) as { did?: string; response: RegistrationResponseJSON };
          if (!body.response) return jsonResponse({ error: 'response required' }, 400);
          const result = await verifyRegister(request, body);
          return jsonResponse({ verified: true, did: result.did, credentialID: result.credentialID });
        } catch (error) {
          return webauthnError(error);
        }
      }

      // Passkey (WebAuthn) login — verify a passkey and bind it to its DID.
      if (url.pathname === '/api/webauthn/login/options' && request.method === 'POST') {
        try {
          const body = (await request.json()) as { did?: string };
          const options = await generateLoginOptions(request, body);
          return jsonResponse(options);
        } catch (error) {
          return webauthnError(error);
        }
      }

      if (url.pathname === '/api/webauthn/login/verify' && request.method === 'POST') {
        try {
          const body = (await request.json()) as { response: AuthenticationResponseJSON };
          if (!body.response) return jsonResponse({ error: 'response required' }, 400);
          const result = await verifyLogin(request, body);
          if (!env.ROLE_JWT_SECRET) return jsonResponse({ error: 'ROLE_JWT_SECRET not configured' }, 500);
          // OAuth 2.1 / RFC 8707: when enabled, the viewer token is audience-bound
          // to the requesting origin (docs/ZERO-TRUST.md §4).
          const oauth21 = isOAuth21Enabled(env.OAUTH21_ENABLED);
          const aud = url.origin;
          const token = oauth21
            ? await signRoleTokenOAuth21(env.ROLE_JWT_SECRET, result.did, 'viewer', aud)
            : await signRoleToken(env.ROLE_JWT_SECRET, result.did, 'viewer');
          if (oauth21) recordOAuth21Issuance(env, ctx, token, result.did, 'viewer', aud);
          return jsonResponse({
            verified: true,
            did: result.did,
            token,
            role: 'viewer',
            ttl: ROLE_TTL_SECONDS.viewer,
            ...(oauth21 ? { token_type: 'Bearer', aud } : {}),
          });
        } catch (error) {
          return webauthnError(error);
        }
      }

      const apiPath = url.pathname.slice(5);
      const route = routes[apiPath];
      const start = Date.now();

      if (!route) {
        trackUsage(env, ctx, apiPath, request.method, 404, Date.now() - start);
        return new Response(`API route not found: ${apiPath}`, {
          status: 404,
          headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // RBAC gate — write routes require a role token with sufficient role,
      // or (when ZERO_TRUST_TEAM_DOMAIN is set) a valid Cloudflare Access JWT.
      if (ADMIN_ROUTES.has(apiPath) || OPERATOR_ROUTES.has(apiPath)) {
        const required: Role = ADMIN_ROUTES.has(apiPath) ? 'admin' : 'operator';
        const authHeader = request.headers.get('Authorization') ?? '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        let roleToken: RoleToken | null = null;
        if (env.ROLE_JWT_SECRET) {
          if (isOAuth21Enabled(env.OAUTH21_ENABLED)) {
            // OAuth 2.1 / RFC 8707: enforce audience binding first; fall back to
            // the legacy (unbound) verifier during the migration window so
            // pre-existing CI tokens keep working until reissued.
            roleToken = await verifyRoleTokenOAuth21(env.ROLE_JWT_SECRET, token, url.origin);
            if (!roleToken) roleToken = await verifyRoleToken(env.ROLE_JWT_SECRET, token);
          } else {
            roleToken = await verifyRoleToken(env.ROLE_JWT_SECRET, token);
          }
        }

        let accessIdentity: AccessJwtIdentity | null = null;
        if (env.ZERO_TRUST_TEAM_DOMAIN) {
          accessIdentity = await verifyAccessJwt(request, env.ZERO_TRUST_TEAM_DOMAIN);
        }
        // Access grant mapping: any valid JWT → viewer (read); email present → operator.
        const accessRole: Role | null = accessIdentity ? (accessIdentity.email ? 'operator' : 'viewer') : null;

        const authorized =
          hasRole(roleToken, required) || (accessRole !== null && ROLE_LEVEL[accessRole] >= ROLE_LEVEL[required]);

        if (!authorized) {
          const insufficient = roleToken ? `role '${roleToken.role}' insufficient for ${apiPath}` : accessIdentity ? `Access grant '${accessRole}' insufficient for ${apiPath}` : 'role token or Cloudflare Access JWT required (Authorization: Bearer <token>)';
          trackUsage(env, ctx, apiPath, request.method, roleToken || accessIdentity ? 403 : 401, Date.now() - start);
          return new Response(JSON.stringify({ error: insufficient }), {
            status: roleToken || accessIdentity ? 403 : 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          });
        }
      }

      try {
        const headers = new Headers({
          'Accept': 'application/json',
        });
        if (request.headers.get('Content-Type')) {
          headers.set('Content-Type', request.headers.get('Content-Type')!);
        }
        if (request.headers.get('Authorization')) {
          headers.set('Authorization', request.headers.get('Authorization')!);
        }
        if (apiPath.startsWith('sbt/') && env.SBT_ISSUE_TOKEN) {
          headers.set('X-Issue-Token', env.SBT_ISSUE_TOKEN);
        }

        const proxyRequest = new Request(`https://${route.service.toLowerCase()}.trimtab-signal.workers.dev${route.path}${url.search}`, {
          method: request.method,
          headers,
          body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text(),
        });
        const response = await env[route.service].fetch(proxyRequest);
        const text = await response.text();
        trackUsage(env, ctx, apiPath, request.method, response.status, Date.now() - start);
        return new Response(text, {
          status: response.status,
          headers: {
            'Content-Type': response.headers.get('content-type') || 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        trackUsage(env, ctx, apiPath, request.method, 502, Date.now() - start);
        return new Response(`Proxy error: ${error instanceof Error ? error.message : 'Unknown'}`, {
          status: 502,
          headers: { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' },
        });
      }
    }

    // SPA fallback: serve the app shell for deep-link paths (e.g. /revenue) so
    // universal links on monetization.p31ca.org land on the correct surface.
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404 && request.method === 'GET' && !/\.[a-z0-9]+$/i.test(url.pathname)) {
      const index = await env.ASSETS.fetch(new Request('https://assets/index.html'));
      if (index.ok) return new Response(index.body, { status: 200, headers: index.headers });
    }
    return assetResponse;
  },
};
