/**
 * mev-arbitrage — opportunities stub. Returns the client `Opportunity[]`
 * shape so the monetization portal renders non-error.
 */
export interface Env {}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/health') return json({ status: 'ok', service: 'mev-arbitrage' });
    if (path === '/opportunities') {
      return json({ opportunities: [] });
    }
    if (path === '/execute' && request.method === 'POST') {
      return json({ executed: false, note: 'stub — no real MEV execution yet' });
    }
    return json({ error: `not found: ${path}` }, 404);
  },
};