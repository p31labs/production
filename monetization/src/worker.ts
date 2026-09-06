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
}

const routes: Record<string, { service: keyof Env; path: string }> = {
  'revenue/summary': { service: 'REVENUE_LEDGER', path: '/revenue/summary' },
  'entitlement/check': { service: 'ENTITLEMENT', path: '/entitlement/check' },
  'entitlement/tier-set': { service: 'ENTITLEMENT', path: '/entitlement/tier-set' },
  'love/issue': { service: 'ENTITLEMENT', path: '/love/issue' },
  'auto-compounder/positions': { service: 'AUTO_COMPOUNDER', path: '/positions' },
  'mev-arbitrage/opportunities': { service: 'MEV_ARBITRAGE', path: '/opportunities' },
  'yield-vault/stats': { service: 'YIELD_VAULT', path: '/stats' },
  'allocator/health': { service: 'ALLOCATOR', path: '/health' },
  'config': { service: 'CONFIG_GATEWAY', path: '/api/config' },
  'config/validate': { service: 'CONFIG_GATEWAY', path: '/api/config/validate' },
  'config/flags': { service: 'CONFIG_GATEWAY', path: '/api/config/flags' },
  'usage': { service: 'CONFIG_GATEWAY', path: '/api/usage' },
};

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

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
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

    return env.ASSETS.fetch(request);
  },
};
