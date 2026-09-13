export interface RevenueSummary {
  total_usdc: string;
  total_eur: string;
  total_love: string;
  count: number;
  avg_per_transaction: string;
}

export interface Position {
  id: string;
  chain: string;
  protocol: string;
  amount: string;
  apy_bps: number;
  created_at: string;
}

export interface Opportunity {
  id: string;
  chain: string;
  dex_path: string[];
  profit_bps: number;
  net_profit: string;
  gas_estimate: string;
  timestamp: string;
}

export interface LoveStats {
  total_love: string;
  transaction_count: number;
  last_harvest: string;
}

export interface AllocatorStatus {
  status: 'ok' | 'degraded' | 'down';
  last_rebalance: string;
  total_allocated: string;
  roi_30d: string;
}

export interface BtcpayInvoice {
  id: string;
  amount: string;
  currency: string;
  status: string;
  checkoutLink?: string;
  createdTime?: string;
  paymentMethods?: any[];
}

export interface BtcpayDonation {
  id: string;
  invoice_id: string;
  amount: string;
  currency: string;
  order_id?: string;
  status: string;
  swept: number;
  created_at: number;
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: string;
  remaining?: string;
}

function proxyUrl(path: string, search?: string): string {
  const url = new URL(`/api/${path}`, 'https://p31-monetization.trimtab-signal.workers.dev');
  if (search) url.search = search;
  return url.toString();
}

export const api = {
  async getRevenueSummary(): Promise<RevenueSummary> {
    const res = await fetch(proxyUrl('revenue/summary', 'source=x402&range=30d'));
    if (!res.ok) throw new Error('Revenue summary failed');
    return res.json();
  },

  async checkEntitlement(did: string, amount: string, loves?: boolean): Promise<EntitlementResult> {
    const res = await fetch(proxyUrl('entitlement/check'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did, amount, loves }),
    });
    if (!res.ok) throw new Error('Entitlement check failed');
    return res.json();
  },

  async getPositions(): Promise<{ positions: Position[] }> {
    const res = await fetch(proxyUrl('auto-compounder/positions'));
    if (!res.ok) throw new Error('Failed to fetch positions');
    return res.json();
  },

  async getOpportunities(chain?: string): Promise<{ opportunities: Opportunity[] }> {
    const search = chain ? `chain=${chain}` : 'status=pending';
    const res = await fetch(proxyUrl(`mev-arbitrage/opportunities?${search}`));
    if (!res.ok) throw new Error('MEV scan failed');
    return res.json();
  },

  async getLoveHarvest(): Promise<LoveStats> {
    const res = await fetch(proxyUrl('yield-vault/stats'));
    if (!res.ok) throw new Error('Yield vault stats failed');
    return res.json();
  },

  async getAllocatorStatus(): Promise<AllocatorStatus> {
    const res = await fetch(proxyUrl('allocator/health'));
    if (!res.ok) throw new Error('Allocator status failed');
    return res.json();
  },

  async createInvoice(amount: string, currency: string, orderId?: string): Promise<BtcpayInvoice> {
    const url = new URL('/api/btcpay/invoice', 'https://p31-monetization.trimtab-signal.workers.dev');
    url.searchParams.set('amount', amount);
    url.searchParams.set('currency', currency);
    if (orderId) url.searchParams.set('order_id', orderId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Invoice creation failed');
    const json = await res.json();
    return json.data || json;
  },

  async getDonations(): Promise<{ donations: BtcpayDonation[] }> {
    const res = await fetch(proxyUrl('btcpay/donations'));
    if (!res.ok) throw new Error('Failed to fetch donations');
    return res.json();
  },

  async sweepDonations(): Promise<{ swept: boolean; count: number; totalBTC: string }> {
    const res = await fetch(proxyUrl('btcpay/sweep'), { method: 'POST' });
    if (!res.ok) throw new Error('Sweep failed');
    const json = await res.json();
    return json.data || json;
  },
};
