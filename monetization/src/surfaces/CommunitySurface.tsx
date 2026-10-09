import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { StatusBadge } from '../components/StatusBadge';
import { queryStatus } from '../components/WidgetTile';
import { useIdentityStore } from '../lib/useIdentityStore';
import { doraMetricsQuery, revenueSummaryQuery, sbtListQuery, sloMetricsQuery } from '../lib/api/queries';
import { formatCurrency } from '../lib/formatters';

/** Sample data — no live proposal endpoint yet. */
const ACTIVE_PROPOSALS = 0;

const PROPOSAL_TYPES = [
  { type: 'Routine', threshold: 'Operator decision', quorum: 'None — daily operations' },
  { type: 'Significant', threshold: 'Community vote · 7-day window', quorum: 'Majority of votes cast' },
  { type: 'Constitutional', threshold: 'Community vote · supermajority', quorum: 'Two-thirds + quorum floor' },
];

const SBT_LABEL: Record<string, string> = {
  'proof-of-contribution': 'Proof of Contribution',
  'founding-contributor': 'Founding Contributor',
  'community-builder': 'Community Builder',
  'impact-amplifier': 'Impact Amplifier',
  'code-contributor': 'Code Contributor',
  'care-keeper': 'Care Keeper',
};

export default function CommunitySurface() {
  const identity = useIdentityStore((s) => s.identity);
  const connect = useIdentityStore((s) => s.connect);
  const connecting = useIdentityStore((s) => s.connecting);

  const revenue = useQuery(revenueSummaryQuery());
  const dora = useQuery(doraMetricsQuery);
  const slo = useQuery(sloMetricsQuery);

  const did = identity?.did ?? '';
  const sbts = useQuery(sbtListQuery(did));
  const list = sbts.data ?? [];

  const revSt = queryStatus(revenue);
  const doraSt = queryStatus(dora);
  const sloSt = queryStatus(slo);

  const d = dora.data;
  const s = slo.data;

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">Community</h2>
          <p className="surface-sub">
            Governance is ours, not mine. SBT-weighted merit voting, transparent treasury, and contribution recognition.
          </p>
        </div>
        <div className="surface-actions">
          <a className="btn btn-glass" href="/docs/GOVERNANCE.md" title="Community governance framework">Governance doc</a>
        </div>
      </header>

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Governance</h3>
      <div className="metric-grid">
        <MetricCard label="Active proposals" value={ACTIVE_PROPOSALS} sub="open community votes" accent="cyan" status="live" />
        <MetricCard label="Voting method" value="SBT-weighted" sub="180d linear decay · merit over capital" accent="violet" status="live" />
        <MetricCard label="Treasury" value="Transparent" sub="hash-chained allocations" accent="gold" status="live" />
        <MetricCard label="Contributor tiers" value="5 SBT-backed" sub="Founding · Builder · Code · Amplifier · Care" accent="green" status="live" />
      </div>

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Proposal types</h3>
      <div className="row-list">
        {PROPOSAL_TYPES.map((p) => (
          <div key={p.type} className="row-card">
            <div className="row-card__head">
              <span className="row-card__title">{p.type}</span>
              <span className="row-card__value">{p.threshold}</span>
            </div>
            <div className="row-card__meta">Quorum: {p.quorum}</div>
          </div>
        ))}
      </div>

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>My contributions → recognition</h3>
      {!identity ? (
        <div className="empty-state">
          <h3>No identity connected</h3>
          <p>Connect your sovereign DID to see how your contributions map to SBT recognition and voting weight.</p>
          <button className="btn btn-primary" type="button" onClick={() => void connect()} disabled={connecting}>
            {connecting ? 'Connecting…' : 'Connect identity'}
          </button>
        </div>
      ) : sbts.isPending ? (
        <div className="empty-state"><h3>Loading recognitions…</h3></div>
      ) : list.length === 0 ? (
        <div className="empty-state"><h3>No recognitions yet</h3><p>Verified contributions mint non-transferable SBTs from the p31-sbt registry.</p></div>
      ) : (
        <div className="row-list">
          {list.map((sbt) => (
            <div key={sbt.id} className="row-card">
              <div className="row-card__head">
                <span className="row-card__title">{SBT_LABEL[sbt.type] ?? sbt.type}</span>
                <StatusBadge status={sbt.anchored ? 'live' : 'stale'} />
              </div>
              <div className="row-card__meta mono">kind: {sbt.type}</div>
              <div className="row-card__meta mono">hash {sbt.hash.slice(0, 12)}…</div>
            </div>
          ))}
        </div>
      )}

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Fund transparency</h3>
      {revenue.isError && <StatusBanner kind="error">Fund transparency metrics unreachable.</StatusBanner>}
      <div className="metric-grid">
        <MetricCard
          label="Total revenue"
          value={`$${formatCurrency(revenue.data?.total_usdc ?? '0')}`}
          sub="all-time USDC settled"
          status={revSt.status}
          lastUpdated={revenue.dataUpdatedAt ? new Date(revenue.dataUpdatedAt) : null}
        />
        <MetricCard
          label="DORA deploys"
          value={d ? `${d.deploy_frequency.total}` : '…'}
          sub="7-day window · all services"
          accent="green"
          status={doraSt.status}
          lastUpdated={dora.dataUpdatedAt ? new Date(dora.dataUpdatedAt) : null}
        />
        <MetricCard
          label="SLO availability"
          value={s?.availability != null ? `${(s.availability * 100).toFixed(3)}%` : '…'}
          sub={`target ${s?.target != null ? `${(s.target * 100).toFixed(1)}%` : '99.9%'} · ${s?.window_minutes ?? 90}min window`}
          accent={s?.availability != null && s.availability < 0.999 ? 'red' : 'gold'}
          status={sloSt.status}
          lastUpdated={s?.recorded_at ? new Date(s.recorded_at) : null}
        />
      </div>
    </div>
  );
}