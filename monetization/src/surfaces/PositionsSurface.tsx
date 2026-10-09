import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { useLiveSurface } from '../hooks/useLiveSurface';
import { queryStatus } from '../components/WidgetTile';
import { positionsQuery, queryKeys } from '../lib/api/queries';
import { formatCurrency, formatAPY, formatRelativeTime } from '../lib/formatters';

export default function PositionsSurface() {
  const q = useQuery(positionsQuery);
  useLiveSurface('positions', queryKeys.positions.list());

  const positions = q.data?.positions ?? [];
  const totalDeposited = positions.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
  const avgApy = positions.length > 0
    ? positions.reduce((sum, p) => sum + p.apy_bps, 0) / positions.length
    : 0;
  const st = queryStatus(q);

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Positions</h2>
          <p className="surface-sub">Yield vault positions, APY, and auto-compounder status.</p>
        </div>
      </header>

      {q.isError && <StatusBanner kind="error">Failed to load positions.</StatusBanner>}

      <div className="metric-grid">
        <MetricCard
          label="Total Deposited"
          value={`$${formatCurrency(totalDeposited)}`}
          sub={`${positions.length} active positions`}
          accent="green"
          status={st.status}
          lastUpdated={q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null}
        />
        <MetricCard
          label="Average APY"
          value={formatAPY(avgApy)}
          sub="Across all positions"
          accent="gold"
          status={st.status}
          lastUpdated={q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null}
        />
      </div>

      {q.isPending ? (
        <div className="empty-state"><h3>Loading positions…</h3></div>
      ) : positions.length === 0 ? (
        <div className="empty-state">
          <h3>No active positions</h3>
          <p>Deposit your first USDC to start earning APY through the capital machine. Configure a vault in Settings.</p>
        </div>
      ) : (
        <div className="row-list">
          {positions.map((p) => (
            <div key={p.id} className="row-card">
              <div className="row-card__head">
                <span className="row-card__title">{p.protocol}</span>
                <span className="badge badge-spark">{p.chain}</span>
              </div>
              <div className="row-card__meta">
                <span className="row-card__value">{formatCurrency(p.amount)} USDC</span>
                <span> · {formatAPY(p.apy_bps)}</span>
              </div>
              <div className="row-card__meta">{formatRelativeTime(p.created_at)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}