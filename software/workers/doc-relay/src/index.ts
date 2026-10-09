import { DocRelayDO } from './doc-relay';
import type { Env } from './doc-relay';

export { DocRelayDO };

function allowOrigin(request: Request, env: Env): string {
  const configured = (env.CORS_ALLOW_ORIGIN ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const origin = request.headers.get('Origin') ?? '';
  if (configured.includes('*')) return '*';
  return configured.includes(origin) ? origin : '';
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      const origin = allowOrigin(request, env);
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin,
          'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          Vary: 'Origin',
        },
      });
    }

    const room = (url.pathname.replace(/^\/+/, '') || 'default').slice(0, 64);
    const id = env.DOC_RELAY.idFromName(room);
    const stub = env.DOC_RELAY.get(id);
    const response = await stub.fetch(request);

    const origin = allowOrigin(request, env);
    const headers = new Headers(response.headers);
    if (origin) headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
    return new Response(response.body, { status: response.status, headers });
  },
} satisfies ExportedHandler<Env>;