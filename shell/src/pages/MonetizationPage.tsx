import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useConfig } from '../hooks/useConfig';
import { api } from '../api/client';
import GlassCard from '../components/ui/GlassCard';
import PageHeader from '../components/PageHeader';

export default function MonetizationPage() {
  const config = useConfig();
  const [summary, setSummary] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loveStats, setLoveStats] = useState<any>(null);
  const [allocator, setAllocator] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [invoiceCurrency, setInvoiceCurrency] = useState('USD');
  const [invoiceResult, setInvoiceResult] = useState<any>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      if (config.features.x402Gateway) await api.getRevenueSummary().then(setSummary);
      if (config.features.autoCompounder) await api.getPositions().then((r: any) => setPositions(r.positions || []));
      if (config.features.mevArbitrage) await api.getOpportunities().then((r: any) => setOpportunities(r.opportunities || []));
      if (config.features.loveTokenGating) await api.getLoveHarvest().then(setLoveStats);
      await api.getAllocatorStatus().then(setAllocator);
      if (config.features.btc) await api.getDonations().then((r: any) => setDonations(r.donations || [])).catch(() => {});
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoiceAmount.trim()) return;
    setCreating(true);
    setInvoiceError(null);
    setInvoiceResult(null);
    try {
      const result = await api.createInvoice(invoiceAmount.trim(), invoiceCurrency, `shell-${Date.now()}`);
      setInvoiceResult(result);
      setInvoiceAmount('');
    } catch (e: any) {
      setInvoiceError(e?.message || 'Invoice creation failed');
    } finally {
      setCreating(false);
    }
  };

  useEffect(() => { refresh(); }, [config]);

  const totalDeposited = positions.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  return (
    <div className="monetization-page">
      <PageHeader
        title="Monetization Command Center"
        description="x402 · Auto-Compounder · MEV · Cross-Chain · LOVE Token"
        controls={
          <button className="btn btn-primary" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      <div className="monetization-grid">
        {config.features.x402Gateway && (
          <GlassCard title="x402 Revenue" variant="default" className="metric-card">
            <div className="metric-value accent-cyan">${summary?.total_usdc || '0'} USDC</div>
            <div className="metric-sub">{summary?.count || 0} transactions</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.autoCompounder && (
          <GlassCard title="Auto-Compounder" variant="phos" className="metric-card">
            <div className="metric-value accent-green">{positions.length} positions</div>
            <div className="metric-sub">${totalDeposited.toFixed(2)} deposited · ~9% APY</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.mevArbitrage && (
          <GlassCard title="MEV Arbitrage" variant="bash" className="metric-card">
            <div className="metric-value accent-gold">{opportunities.length} opportunities</div>
            <div className="metric-sub">Ethereum · Base · Solana</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.loveTokenGating && (
          <GlassCard title="LOVE Token" variant="bonding" className="metric-card">
            <div className="metric-value accent-violet">{loveStats?.total_love || '0'} LOVE</div>
            <div className="metric-sub">Soulbound · Non-transferable</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.crossChainArbitrage && (
          <GlassCard title="Cross-Chain" variant="default" className="metric-card">
            <div className="metric-value accent-iris">Monitoring</div>
            <div className="metric-sub">Bridge health · Spreads</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        <GlassCard title="Allocator" variant="default" className="metric-card">
          <div className="metric-value accent-cyan">{allocator?.status === 'ok' ? 'Operational' : '—'}</div>
          <div className="metric-sub">Capital routing · ROI tracking</div>
          <div className="metric-graph" />
        </GlassCard>

        {config.features.btc && (
          <GlassCard title="BTCPay" variant="default" className="metric-card">
            <div className="metric-value accent-gold">{donations.length} donations</div>
            <div className="metric-sub">Self-custody · Greenfield API</div>
            <div className="metric-graph" />
          </GlassCard>
        )}
      </div>

      {positions.length > 0 && (
        <GlassCard title="Active Positions" className="positions-panel">
          <div className="positions-list">
            {positions.map((p: any) => (
              <div key={p.id} className="position-row">
                <span className="position-protocol">{p.protocol || 'Aave'}</span>
                <span className="position-chain">{p.chain || 'Base'}</span>
                <span className="position-amount">{parseFloat(p.amount || 0).toFixed(2)} USDC</span>
                <span className="position-apy">{((p.apy_bps || 0) / 100).toFixed(2)}% APY</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {config.features.btc && (
        <GlassCard title="Create Invoice" className="positions-panel">
          <div className="positions-list">
            <div className="position-row">
              <input
                className="chat-composer-input"
                style={{ maxWidth: 140 }}
                placeholder="Amount"
                aria-label="Invoice amount"
                value={invoiceAmount}
                onChange={(e) => setInvoiceAmount(e.target.value)}
                inputMode="decimal"
              />
              <select
                className="chat-composer-input"
                style={{ maxWidth: 110 }}
                aria-label="Invoice currency"
                value={invoiceCurrency}
                onChange={(e) => setInvoiceCurrency(e.target.value)}
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="BTC">BTC</option>
              </select>
              <button type="button" className="btn primary" onClick={handleCreateInvoice} disabled={creating || !invoiceAmount.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
            {invoiceError && <div className="position-row"><span className="position-protocol">{invoiceError}</span></div>}
            {invoiceResult && (
              <div className="position-row">
                <span className="position-protocol">{invoiceResult.id || 'created'}</span>
                <span className="position-chain">{invoiceResult.status || ''}</span>
                {invoiceResult.checkoutLink && (
                  <a href={invoiceResult.checkoutLink} target="_blank" rel="noreferrer">Pay</a>
                )}
              </div>
            )}
          </div>
        </GlassCard>
      )}

      {config.features.btc && donations.length > 0 && (
        <GlassCard title="Recent Donations" className="positions-panel">
          <div className="positions-list">
            {donations.slice(0, 8).map((d: any) => (
              <div key={d.id} className="position-row">
                <span className="position-protocol">{d.amount} {d.currency}</span>
                <span className="position-chain">{d.order_id || d.orderId || ''}</span>
                <span className="position-amount">{d.status}</span>
                <span className="position-apy">{d.swept ? 'swept' : 'pending'}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {lastRefresh && (
        <div className="last-refresh">Last updated: {lastRefresh.toLocaleTimeString()}</div>
      )}
    </div>
  );
}
