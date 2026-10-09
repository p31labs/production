import type { CrossAppStateDO, CrossAppStateEnv } from './worker/CrossAppStateDO';

export { CrossAppStateDO } from './worker/CrossAppStateDO';

const ALLOWED_ORIGINS = [
  'https://p31ca.org',
  'https://www.p31ca.org',
  'https://app.p31ca.org',
  'https://p31-shell.trimtab-signal.workers.dev',
  'https://spaceship-earth.pages.dev',
  'http://localhost:5200',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

function getOrigin(request: Request): string | null {
  return request.headers.get('Origin');
}

function getCorsOrigin(origin: string | null, pathname: string): string {
  if (pathname === '/api/health') return '*';
  const isProtected = pathname === '/mcp' || pathname.startsWith('/api/');
  if (isProtected) {
    if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
    return 'null';
  }
  if (origin && ALLOWED_ORIGINS.includes(origin)) return origin;
  return '*';
}

function getCsp(pathname: string): string | undefined {
  if (pathname === '/mcp') {
    return "default-src 'none'; connect-src 'self';";
  }
  if (pathname === '/api/health' || pathname === '/mcp/health' || pathname.startsWith('/api/')) {
    return undefined;
  }
  return "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://api.p31ca.org https://mcp-x402-gateway.p31ca.org https://p31-design-mcp.trimtab-signal.workers.dev https://federation.p31ca.org https://zenodo.org; frame-src 'none'; object-src 'none'; base-uri 'self'; require-trusted-types-for 'script'";
}

function addAllHeaders(response: Response, pathname: string): Response {
  const headers = new Headers();
  for (const [key, value] of response.headers) {
    if (key.toLowerCase() !== 'content-security-policy-report-only') {
      headers.set(key, value);
    }
  }
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=(), bluetooth=()');
  const csp = getCsp(pathname);
  if (csp) headers.set('Content-Security-Policy-Report-Only', csp);
  return new Response(response.body, { status: response.status, headers });
}

interface Env extends CrossAppStateEnv {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  SPACESHIP_RELAY: { fetch: (request: Request) => Promise<Response> };
}

const CROSS_APP_STATE_ID = 'global';

async function handleCrossApp(request: Request, env: Env, corsHeaders: Record<string, string>, pathname: string): Promise<Response> {
  const id = env.CROSS_APP_STATE.idFromName(CROSS_APP_STATE_ID);
  const response = await env.CROSS_APP_STATE.get(id).fetch(request);
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(corsHeaders)) headers.set(key, value);
  return addAllHeaders(new Response(response.body, { status: response.status, headers }), pathname);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const origin = getOrigin(request);
    const cors = getCorsOrigin(origin, pathname);

    const corsHeaders: Record<string, string> = {
      'Access-Control-Allow-Origin': cors,
    };
    if (cors !== '*') {
      corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    }

    const baseHeaders = (contentType: string) => ({
      'Content-Type': contentType,
      ...corsHeaders,
    });

    if (pathname === '/api/health') {
      return addAllHeaders(new Response(JSON.stringify({ status: 'ok', version: '1.0', service: 'p31-shell', timestamp: Date.now() }), {
        status: 200,
        headers: baseHeaders('application/json'),
      }), pathname);
    }

    if (pathname === '/api/duna/stats') {
      return addAllHeaders(new Response(JSON.stringify({ members: 1, active: 0, target: 100 }), {
        status: 200,
        headers: baseHeaders('application/json'),
      }), pathname);
    }

    if (pathname === '/mcp/health') {
      return addAllHeaders(new Response(JSON.stringify({ status: 'ok', version: '1.0' }), {
        status: 200,
        headers: baseHeaders('application/json'),
      }), pathname);
    }

    if (pathname === '/mcp' && (request.method === 'POST' || request.method === 'OPTIONS')) {
      if (request.method === 'OPTIONS') {
        return addAllHeaders(new Response(null, {
          status: 204,
          headers: {
            ...corsHeaders,
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        }), pathname);
      }
      try {
        const { handleMcpRequest } = await import('./lib/mcpServer');
        return addAllHeaders(await handleMcpRequest(request), pathname);
      } catch {
        return addAllHeaders(new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: { code: -32603, message: 'MCP server unavailable' },
            id: null,
          }),
          {
            status: 503,
            headers: baseHeaders('application/json'),
          }
        ), pathname);
      }
    }

    // ── Cross-app state (Durable Object, SQLite-backed) ──
    if (pathname === '/api/shell-state' || pathname === '/api/spaceship-state' || pathname === '/api/state') {
      if (request.method === 'OPTIONS') {
        return addAllHeaders(new Response(null, { status: 204, headers: baseHeaders('text/plain') }), pathname);
      }
      return handleCrossApp(request, env, corsHeaders, pathname);
    }

    if (pathname === '/ws/state' && request.headers.get('Upgrade') === 'websocket') {
      if (origin && !ALLOWED_ORIGINS.includes(origin)) {
        return new Response('Forbidden: origin not allowed', { status: 403 });
      }
      return env.CROSS_APP_STATE.get(env.CROSS_APP_STATE.idFromName(CROSS_APP_STATE_ID)).fetch(request);
    }

    if (pathname === '/api/status') {
      return stateHandler.getStatus(request, env);
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    // The service worker's importScripts() must not be subject to
    // `require-trusted-types-for 'script'`, or the SW fails to install and
    // the "new version available" banner never clears.
    if (pathname === '/sw.js' || pathname.startsWith('/workbox-')) {
      headers.delete('content-security-policy');
      headers.delete('content-security-policy-report-only');
      headers.set('content-security-policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com");
    }
    return new Response(assetResponse.body, { status: assetResponse.status, headers });
  },
};

// ── Cross-app status aggregation ──

export const stateHandler = {
  async getStatus(_: Request, env: Env): Promise<Response> {
    const spaceshipUrl = 'https://spaceship-relay.trimtab-signal.workers.dev/health';
    let spaceshipOk = false;
    try {
      const res = await env.SPACESHIP_RELAY.fetch(new Request(spaceshipUrl));
      spaceshipOk = res.ok;
    } catch { spaceshipOk = false; }
    return addAllHeaders(new Response(JSON.stringify({
      shell: { status: 'ok', url: 'https://p31-shell.trimtab-signal.workers.dev' },
      spaceship: { status: spaceshipOk ? 'ok' : 'unknown', url: spaceshipUrl },
      timestamp: Date.now(),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }), '/api/status');
  },
};
