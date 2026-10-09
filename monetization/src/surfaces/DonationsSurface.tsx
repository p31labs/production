import { useEffect, useState } from 'react';
import { api, type BtcpayDonation } from '../api/client';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { useNotifStore } from '../lib/useNotifStore';
import { formatCurrency, formatRelativeTime } from '../lib/formatters';

export default function DonationsSurface() {
  const [donations, setDonations] = useState<BtcpayDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sweeping, setSweeping] = useState(false);
  const notify = useNotifStore((s) => s.notify);

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
      const result = await api.sweepDonations();
      await loadDonations();
      notify({
        kind: 'success',
        title: 'Sweep complete',
        body: `${result.count} donation(s), ${formatCurrency(result.totalBTC)} BTC swept`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sweep failed');
      notify({ kind: 'error', title: 'Sweep failed' });
    } finally {
      setSweeping(false);
    }
  };

  useEffect(() => {
    void loadDonations();
  }, []);

  const unswept = donations.filter((d) => !d.swept);
  const totalBTC = donations.reduce((s, d) => s + parseFloat(d.amount || '0'), 0);
  const unsweptBTC = unswept.reduce((s, d) => s + parseFloat(d.amount || '0'), 0);

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Donations</h2>
          <p className="surface-sub">Community LOVE inflows and BTCPay donations.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={sweep} disabled={sweeping || unswept.length === 0}>
          {sweeping ? 'Sweeping…' : 'Sweep to Vault'}
        </button>
      </header>

      {error && <StatusBanner kind="error">{error}</StatusBanner>}

      <div className="metric-grid">
        <MetricCard label="Total Donations" value={donations.length} sub={`${formatCurrency(totalBTC)} BTC`} />
        <MetricCard label="Unswept" value={unswept.length} sub={`${formatCurrency(unsweptBTC)} BTC pending`} accent="gold" />
      </div>

      {loading ? (
        <div className="empty-state"><h3>Loading donations…</h3></div>
      ) : donations.length === 0 ? (
        <div className="empty-state"><h3>No donations yet</h3><p>Donations arrive via BTCPay and settle to the vault.</p></div>
      ) : (
        <div className="row-list">
          {donations.map((d) => (
            <div key={d.id} className="row-card">
              <div className="row-card__head">
                <span className="row-card__title">{formatCurrency(d.amount)} BTC</span>
                <span className={`badge ${d.swept ? 'badge-spark' : 'badge-workshop'}`}>
                  {d.swept ? 'SWEPT' : 'PENDING'}
                </span>
              </div>
              <div className="row-card__meta">{d.status} · {formatRelativeTime(d.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}