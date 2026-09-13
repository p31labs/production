import { useState, useEffect } from 'react';
import { api } from '../api/client';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatRelativeTime } from '../lib/formatters';

export default function Donations() {
  const [donations, setDonations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sweeping, setSweeping] = useState(false);

  const loadDonations = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/btcpay/donations');
      if (!res.ok) throw new Error('Failed to load donations');
      const json = await res.json();
      setDonations(json.donations || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load donations');
    } finally {
      setLoading(false);
    }
  };

  const sweep = async () => {
    setSweeping(true);
    setError('');
    try {
      await api.sweepDonations();
      await loadDonations();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sweep failed');
    } finally {
      setSweeping(false);
    }
  };

  useEffect(() => {
    loadDonations();
  }, []);

  const unswept = donations.filter((d) => !d.swept);
  const swept = donations.filter((d) => d.swept);
  const totalBTC = donations.reduce((s, d) => s + parseFloat(d.amount || '0'), 0);
  const unsweptBTC = unswept.reduce((s, d) => s + parseFloat(d.amount || '0'), 0);

  return (
    <div className="page-donations">
      <div className="dashboard-grid">
        <GlassCard title="Total Donations" variant="cyan">
          <div className="metric-value accent-cyan">{donations.length}</div>
          <div className="metric-sub">{formatCurrency(totalBTC)} BTC</div>
          <div className="metric-graph" />
        </GlassCard>
        <GlassCard title="Unswept" variant="gold">
          <div className="metric-value accent-gold">{unswept.length}</div>
          <div className="metric-sub">{formatCurrency(unsweptBTC)} BTC pending</div>
          <div className="metric-graph" />
        </GlassCard>
        <GlassCard title="Swept" variant="green">
          <div className="metric-value accent-green">{swept.length}</div>
          <div className="metric-sub">Deposited to yield vault</div>
          <div className="metric-graph" />
        </GlassCard>
      </div>

      {error && <div className="page-error">{error}</div>}

      <div className="positions-list-section">
        <div className="dashboard-actions">
          <button className="btn btn-primary" onClick={sweep} disabled={sweeping || unswept.length === 0}>
            {sweeping ? 'Sweeping…' : `Sweep ${unswept.length} Donation${unswept.length !== 1 ? 's' : ''}`}
          </button>
        </div>
        <h3 className="section-title" style={{ marginTop: 16 }}>Donation History</h3>
        {loading && donations.length === 0 ? (
          <div className="loading-state">Loading donations…</div>
        ) : donations.length === 0 ? (
          <EmptyState
            icon="🎁"
            title="No donations yet"
            description="BTC payments will appear here as donations once invoices are paid."
            steps={[
              '☐ Create an invoice on the Invoices page',
              '☐ Share the payment link with the payer',
              '☐ Donations auto-record on payment',
            ]}
          />
        ) : (
          <div className="positions-list">
            {donations.map((d) => (
              <div key={d.id} className="position-row">
                <div className="position-info">
                  <span className="position-protocol">{d.invoice_id ? `Invoice ${d.invoice_id.slice(0, 8)}…` : 'Direct'}</span>
                  <span className="position-chain">{d.order_id ? `Order: ${d.order_id}` : 'No order ID'}</span>
                </div>
                <div className="position-metrics">
                  <span className="position-amount">{formatCurrency(d.amount)} {d.currency}</span>
                  <span className={`position-apy ${d.swept ? 'accent-green' : 'accent-gold'}`}>
                    {d.swept ? 'Swept' : 'Pending'}
                  </span>
                </div>
                <span className="position-time">{formatRelativeTime(d.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
