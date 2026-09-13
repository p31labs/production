import { usePolling } from '../hooks/usePolling';
import { api } from '../api/client';
import { loadConfig } from '../config';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { formatCurrency, formatAPY, formatRelativeTime, formatTime } from '../lib/formatters';

const config = loadConfig();

export default function Dashboard() {
  const { data: revenue, refetch: refetchRevenue, lastUpdated: revUpdated } = usePolling(api.getRevenueSummary, 30000);
  const { data: positionsData, refetch: refetchPositions, lastUpdated: posUpdated } = usePolling(api.getPositions, 30000);
  const { data: opportunitiesData, refetch: refetchOpportunities, lastUpdated: oppUpdated } = usePolling(api.getOpportunities, 30000);
  const { data: loveStats, refetch: refetchLove, lastUpdated: loveUpdated } = usePolling(api.getLoveHarvest, 30000);
  const { data: allocator, refetch: refetchAllocator, lastUpdated: allocUpdated } = usePolling(api.getAllocatorStatus, 30000);
  const { data: btcRevenue, refetch: refetchBtc, lastUpdated: btcUpdated } = usePolling(
    () => api.getRevenueSummary().then((r) => ({ total: r.total_usdc, count: r.count })),
    30000
  );

  const positions = positionsData?.positions ?? [];
  const opportunities = opportunitiesData?.opportunities ?? [];
  const totalDeposited = positions.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
  const recentUpdated = [revUpdated, posUpdated, oppUpdated, loveUpdated, allocUpdated, btcUpdated]
    .filter((d): d is Date => !!d)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const isOnboarded = positions.length > 0 || (revenue && parseFloat(revenue.total_usdc) > 0);

  return (
    <div className="dashboard-page">
      <div className="dashboard-refresh-note">
        Last updated {recentUpdated ? `${formatRelativeTime(recentUpdated.getTime())} (${formatTime(recentUpdated.getTime())})` : '…'}
      </div>

      {!isOnboarded && (
        <EmptyState
          icon="🚀"
          title="Welcome to P31 Capital Machine"
          description="Your capital machine is ready to generate yield. Complete the setup to start."
          steps={[
            '☐ 1. Connect your first RPC endpoint (Settings → RPC Endpoints)',
            '☐ 2. Add vault addresses for on-chain strategies (Settings → Vaults)',
            '☐ 3. Deploy your first capital to a yield strategy',
            '☐ 4. Watch your capital grow',
          ]}
          actionLabel="Take me to Settings"
          onAction={() => window.location.hash = '#/settings'}
        />
      )}

      <div className="dashboard-grid">
        {config.features.x402 && revenue && (
          <GlassCard title="x402 Revenue" variant="cyan">
            <div className="metric-value accent-cyan">${formatCurrency(revenue.total_usdc)} USDC</div>
            <div className="metric-sub">{revenue.count} transactions</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.autoCompound && (
          <GlassCard title="Auto-Compounder" variant="green">
            <div className="metric-value accent-green">{positions.length} positions</div>
            <div className="metric-sub">${formatCurrency(totalDeposited)} deposited</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.mev && (
          <GlassCard title="MEV Arbitrage" variant="gold">
            <div className="metric-value accent-gold">{opportunities.length} opportunities</div>
            <div className="metric-sub">Ethereum · Base · Solana</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.love && loveStats && (
          <GlassCard title="LOVE Token" variant="violet">
            <div className="metric-value accent-violet">{loveStats.total_love} LOVE</div>
            <div className="metric-sub">Soulbound · Non-transferable</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.btc && btcRevenue && (
          <GlassCard title="BTC Revenue" variant="iris">
            <div className="metric-value accent-iris">${formatCurrency(btcRevenue.total)}</div>
            <div className="metric-sub">{btcRevenue.count} payments via BTCPay</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        {config.features.crossChain && (
          <GlassCard title="Cross-Chain" variant="iris">
            <div className="metric-value accent-iris">Monitoring</div>
            <div className="metric-sub">Bridge health · Spreads</div>
            <div className="metric-graph" />
          </GlassCard>
        )}

        <GlassCard title="Allocator" variant="default">
          <div className="metric-value">
            {allocator ? (
              <StatusBadge status={allocator.status === 'ok' ? 'live' : allocator.status === 'degraded' ? 'beta' : 'down'} />
            ) : (
              '—'
            )}
          </div>
          <div className="metric-sub">Capital routing · ROI tracking</div>
          <div className="metric-graph" />
        </GlassCard>
      </div>

      {positions.length > 0 && (
        <div className="dashboard-section">
          <h3 className="section-title">Active Positions</h3>
          <div className="positions-list">
            {positions.slice(0, 5).map((p) => (
              <div key={p.id} className="position-row">
                <div className="position-info">
                  <span className="position-protocol">{p.protocol}</span>
                  <span className="position-chain">{p.chain}</span>
                </div>
                <div className="position-metrics">
                  <span className="position-amount">{formatCurrency(p.amount)} USDC</span>
                  <span className="position-apy">{formatAPY(p.apy_bps)} APY</span>
                </div>
                <span className="position-time">{formatRelativeTime(p.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="dashboard-actions">
        <button className="btn btn-primary" onClick={() => {
          refetchRevenue();
          refetchPositions();
          refetchOpportunities();
          refetchLove();
          refetchAllocator();
          refetchBtc();
        }}>
          Refresh All
        </button>
      </div>
    </div>
  );
}
