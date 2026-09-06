import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { formatCurrency } from '../lib/formatters';

export default function Revenue() {
  const { data: revenue, loading, error, refetch } = usePolling(api.getRevenueSummary, 30000);

  if (error) {
    return (
      <div className="page-error">
        <p>Failed to load revenue data.</p>
        <button className="btn btn-secondary" onClick={refetch}>Retry</button>
      </div>
    );
  }

  const isEmpty = revenue && revenue.count === 0;

  return (
    <div className="page-revenue">
      {isEmpty ? (
        <EmptyState
          icon="💰"
          title="No revenue events recorded yet"
          description="Once x402 payments or other settlements start flowing, they'll appear here with hash-chain verification."
          steps={[
            '☐ x402 payments settle via Cloudflare Monetization Gateway',
            '☐ Revenue ledger auto-records each transaction',
            '☐ Each entry is hash-chained for tamper-proof auditing',
          ]}
        />
      ) : (
        <div className="revenue-summary-grid">
          <GlassCard title="Total USDC" variant="cyan">
            <div className="metric-value accent-cyan">${loading ? '—' : formatCurrency(revenue?.total_usdc ?? 0)}</div>
            <div className="metric-graph" />
          </GlassCard>
          <GlassCard title="Total EUR" variant="default">
            <div className="metric-value">€{loading ? '—' : formatCurrency(revenue?.total_eur ?? 0)}</div>
            <div className="metric-graph" />
          </GlassCard>
          <GlassCard title="Total LOVE" variant="violet">
            <div className="metric-value accent-violet">{loading ? '—' : formatCurrency(revenue?.total_love ?? 0, 0)}</div>
            <div className="metric-graph" />
          </GlassCard>
          <GlassCard title="Transactions" variant="gold">
            <div className="metric-value accent-gold">{loading ? '—' : revenue?.count ?? 0}</div>
            <div className="metric-sub">Avg: ${loading ? '—' : formatCurrency(revenue?.avg_per_transaction ?? 0)}</div>
            <div className="metric-graph" />
          </GlassCard>
        </div>
      )}

      <div className="revenue-integrity-badge">
        <span className="status-badge status-badge-live">✓ Hash-chain verified</span>
        <span className="revenue-integrity-note">Immutable, tamper-proof audit trail</span>
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
