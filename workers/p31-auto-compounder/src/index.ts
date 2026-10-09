/**
 * auto-compounder — positions stub. Returns the client `Position[]` shape so
 * the monetization portal renders non-error. Replace with real compounding
 * logic when capital routing goes live.
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
    if (path === '/health') return json({ status: 'ok', service: 'auto-compounder' });
    if (path === '/positions') {
      return json({
        positions: [
          { id: 'pos-1', chain: 'base', protocol: 'USDC vault', amount: '1000', apy_bps: 520, created_at: new Date().toISOString() },
        ],
      });
    }
    if (path === '/compound' && request.method === 'POST') {
      return json({ compounded: true, note: 'stub — no real compounding yet' });
    }
    return json({ error: `not found: ${path}` }, 404);
  },
};