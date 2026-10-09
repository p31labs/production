import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { StatusBadge } from '../components/StatusBadge';
import { useLiveSurface } from '../hooks/useLiveSurface';
import { queryStatus } from '../components/WidgetTile';
import { revenueSummaryQuery, revenueLedgerQuery, revenueVerifyQuery, queryKeys } from '../lib/api/queries';
import { revenueTrend } from '../lib/trends';
import { formatCurrency, formatRelativeTime } from '../lib/formatters';

export default function RevenueSurface() {
  const summary = useQuery(revenueSummaryQuery());
  const ledger = useQuery(revenueLedgerQuery(500));
  const verify = useQuery(revenueVerifyQuery);
  useLiveSurface('revenue', queryKeys.revenue.summary('30d'));

  const st = queryStatus(summary);
  const entries = ledger.data?.entries ?? [];
  const trend = ledger.data ? revenueTrend(entries) : { delta: null, sparkline: [] };
  const isEmpty = summary.data?.count === 0;

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Revenue</h2>
          <p className="surface-sub">
            x402 settlements and LOVE flows, hash-chained for tamper-proof auditing.
          </p>
        </div>
        <div className="surface-actions">
          <StatusBadge status={verify.isError ? 'error' : verify.isPending ? 'loading' : verify.data?.valid ? 'live' : 'error'} lastUpdated={verify.dataUpdatedAt ? new Date(verify.dataUpdatedAt) : null} />
          <a
            className="btn btn-glass"
            href={`/audit/verify${verify.data?.last_hash ? `?hash=${verify.data.last_hash}` : ''}`}
            title={`Hash-chain integrity: ${verify.data?.total_entries ?? 0} entries`}
          >
            ✓ Verify chain
          </a>
        </div>
      </header>

      {summary.isError && <StatusBanner kind="error">Failed to load revenue data.</StatusBanner>}

      {isEmpty ? (
        <div className="empty-state">
          <h3>No revenue events recorded yet</h3>
          <p>Once x402 payments or other settlements start flowing, they'll appear here with hash-chain verification.</p>
        </div>
      ) : (
        <div className="metric-grid">
          <MetricCard
            label="Total USDC"
            value={`$${formatCurrency(summary.data?.total_usdc ?? 0)}`}
            sub="settled via x402"
            status={st.status}
            lastUpdated={summary.dataUpdatedAt ? new Date(summary.dataUpdatedAt) : null}
            delta={trend.delta}
            sparkline={trend.sparkline}
          />
          <MetricCard
            label="Total EUR"
            value={`€${formatCurrency(summary.data?.total_eur ?? 0)}`}
            sub="fiat equivalent"
            status={st.status}
            lastUpdated={summary.dataUpdatedAt ? new Date(summary.dataUpdatedAt) : null}
          />
          <MetricCard
            label="Total LOVE"
            value={formatCurrency(summary.data?.total_love ?? 0, 0)}
            sub="soulbound credits"
            accent="violet"
            status={st.status}
            lastUpdated={summary.dataUpdatedAt ? new Date(summary.dataUpdatedAt) : null}
          />
          <MetricCard
            label="Transactions"
            value={summary.data?.count ?? 0}
            sub={`Avg: $${formatCurrency(summary.data?.avg_per_transaction ?? 0)}`}
            accent="gold"
            status={st.status}
            lastUpdated={summary.dataUpdatedAt ? new Date(summary.dataUpdatedAt) : null}
          />
        </div>
      )}

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Ledger</h3>
      {ledger.isPending ? (
        <div className="empty-state"><h3>Loading ledger…</h3></div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><h3>Ledger is empty</h3></div>
      ) : (
        <div className="row-list">
          {entries.slice(0, 12).map((e) => (
            <div key={e.id} className="row-card">
              <div className="row-card__head">
                <span className="row-card__title">{e.source}</span>
                <span className="row-card__value">${formatCurrency(e.amount_usdc)}</span>
              </div>
              <div className="row-card__meta">
                {e.asset} · {formatRelativeTime(e.created_at)}
              </div>
              <div className="row-card__meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  className="integrity-badge"
                  href={`/audit/verify?hash=${e.hash}`}
                  title="Verify this entry's hash chain link"
                >
                  ✓ {e.hash.slice(0, 12)}…
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}