import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import GlassCard from '../components/GlassCard';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatAPY, formatRelativeTime } from '../lib/formatters';

export default function Positions() {
  const { data: positionsData, loading, error, refetch } = usePolling(api.getPositions, 30000);
  const positions = positionsData?.positions ?? [];

  const totalDeposited = positions.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
  const avgApy = positions.length > 0
    ? positions.reduce((sum, p) => sum + p.apy_bps, 0) / positions.length
    : 0;

  if (error) {
    return (
      <div className="page-error">
        <p>Failed to load positions.</p>
        <button className="btn btn-secondary" onClick={refetch}>Retry</button>
      </div>
    );
  }

  return (
    <div className="page-positions">
      <div className="positions-summary-grid">
        <GlassCard title="Total Deposited" variant="green">
          <div className="metric-value accent-green">${formatCurrency(totalDeposited)}</div>
          <div className="metric-sub">{positions.length} active positions</div>
          <div className="metric-graph" />
        </GlassCard>
        <GlassCard title="Average APY" variant="gold">
          <div className="metric-value accent-gold">{formatAPY(avgApy)}</div>
          <div className="metric-sub">Across all positions</div>
          <div className="metric-graph" />
        </GlassCard>
      </div>

      <div className="positions-list-section">
        <h3 className="section-title">Active Positions</h3>
        {loading && positions.length === 0 ? (
          <div className="loading-state">Loading positions…</div>
        ) : positions.length === 0 ? (
          <EmptyState
            icon="📈"
            title="No active positions"
            description="Deposit your first USDC to start earning APY through the capital machine."
            steps={[
              '☐ Add a vault address in Settings',
              '☐ Deploy capital via the allocator',
              '☐ Watch your position compound automatically',
            ]}
            actionLabel="Configure in Settings"
            onAction={() => window.location.hash = '#/settings'}
          />
        ) : (
          <div className="positions-list">
            {positions.map((p) => (
              <div key={p.id} className="position-row">
                <div className="position-info">
                  <span className="position-protocol">{p.protocol}</span>
                  <span className="position-chain">{p.chain}</span>
                </div>
                <div className="position-metrics">
                  <span className="position-amount">{formatCurrency(p.amount)} USDC</span>
                  <span className="position-apy">{formatAPY(p.apy_bps)}</span>
                </div>
                <span className="position-time">{formatRelativeTime(p.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="page-actions">
        <button className="btn btn-primary" onClick={refetch} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
