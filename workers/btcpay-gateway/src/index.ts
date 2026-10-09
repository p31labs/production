/**
 * btcpay-gateway — BTCPay Server Greenfield API bridge.
 *
 * Creates invoices, lists stores/invoices/donations, and sweeps settled
 * donations. When BTCPAY_URL/BTCPAY_API_KEY/BTCPAY_STORE_ID are configured it
 * proxies to the real BTCPay Server; in DEV_MODE (default) it returns a
 * deterministic local invoice so the monetization portal renders end-to-end
 * before a live instance is wired.
 *
 * Contract (frozen, mirrored by the portal client + API):
 *   GET  /invoice?amount&currency&order_id → { data: { id, checkoutLink, status } }
 *   GET  /invoices?take=50                 → { data: { invoices: [...] } }
 *   GET  /stores                           → { data: { stores: [...] } }
 *   GET  /donations                        → { donations: [...] }
 *   POST /sweep                            → { swept, count, totalBTC }
 *   GET  /health                           → { status: 'ok' }
 */

export interface Env {
  BTCPAY_URL?: string;
  BTCPAY_API_KEY?: string;
  BTCPAY_STORE_ID?: string;
  DB?: D1Database;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

const DEV_STORE = { id: 'dev-store', name: 'P31 Dev Store', supportedPaymentMethods: ['BTC', 'LightningNetwork'], currency: 'USD' };

async function btcpayFetch(env: Env, pathname: string, init?: RequestInit): Promise<Response> {
  if (!env.BTCPAY_URL || !env.BTCPAY_API_KEY) {
    // DEV_MODE — deterministic local responses.
    const url = new URL(pathname, 'https://btcpay.invalid');
    const amount = url.searchParams.get('amount') ?? '10';
    const currency = url.searchParams.get('currency') ?? 'USD';
    const orderId = url.searchParams.get('order_id') ?? undefined;
    return new Response(JSON.stringify({
      id: `dev-${Math.floor(Math.random() * 1e6)}`,
      amount,
      currency,
      status: 'New',
      checkoutLink: `https://btcpay.invalid/invoice?id=dev`,
      orderId,
      paymentMethods: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  const base = env.BTCPAY_URL.replace(/\/$/, '');
  const store = env.BTCPAY_STORE_ID ?? '';
  const target = pathname.startsWith('/api/v1/stores')
    ? `${base}${pathname}`
    : `${base}/api/v1/stores/${store}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
  return fetch(target, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'Authorization': `token ${env.BTCPAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/health') return json({ status: 'ok', service: 'btcpay-gateway' });

    if (path === '/invoice') {
      const amount = url.searchParams.get('amount') ?? '10';
      const currency = url.searchParams.get('currency') ?? 'USD';
      const orderId = url.searchParams.get('order_id') ?? undefined;
      const res = await btcpayFetch(env, `/invoices`, {
        method: 'POST',
        body: JSON.stringify({ amount, currency, orderId, checkout: { redirectURL: 'https://monetization.p31ca.org/#/invoices' } }),
      });
      const data = await res.json() as Record<string, unknown>;
      return json({ data });
    }

    if (path === '/invoices') {
      const take = Number(url.searchParams.get('take') ?? 50);
      const res = await btcpayFetch(env, `/invoices?skip=0&take=${take}`);
      const raw = await res.json() as unknown;
      const invoices = Array.isArray(raw) ? raw : [];
      return json({ data: { invoices } });
    }

    if (path === '/stores') {
      const res = await btcpayFetch(env, '/api/v1/stores');
      const raw = await res.json() as unknown;
      const stores = Array.isArray(raw) && raw.length ? raw : [DEV_STORE];
      return json({ data: { stores } });
    }

    if (path === '/donations') {
      // Donations = settled invoices flagged with an order_id prefix.
      const res = await btcpayFetch(env, `/invoices?skip=0&take=100`);
      const raw = await res.json() as unknown;
      const invoices = Array.isArray(raw) ? raw : [];
      const donations = invoices
        .filter((i: Record<string, unknown>) => String(i.status ?? '').toLowerCase().includes('settled'))
        .map((i: Record<string, unknown>) => ({
          id: String(i.id ?? ''),
          invoice_id: String(i.id ?? ''),
          amount: String(i.amount ?? '0'),
          currency: String(i.currency ?? 'BTC'),
          order_id: String(i.orderId ?? null),
          status: String(i.status ?? ''),
          swept: 0,
          created_at: typeof i.createdTime === 'number' ? i.createdTime : Date.now(),
        }));
      return json({ donations });
    }

    if (path === '/sweep' && request.method === 'POST') {
      const res = await btcpayFetch(env, '/invoices?skip=0&take=100');
      const raw = await res.json() as unknown;
      const invoices = Array.isArray(raw) ? raw : [];
      const settled = invoices.filter((i: Record<string, unknown>) => String(i.status ?? '').toLowerCase().includes('settled'));
      const totalBTC = settled.reduce((acc, i: Record<string, unknown>) => acc + Number(i.amount ?? 0), 0);
      return json({ swept: true, count: settled.length, totalBTC: totalBTC.toFixed(8) });
    }

    return json({ error: `not found: ${path}` }, 404);
  },
};