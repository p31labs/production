import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { MetricCard } from './MetricCard';
import { useLiveSurface } from '../hooks/useLiveSurface';
import { useSpoonsStore } from '../lib/useSpoonsStore';
import {
  revenueSummaryQuery,
  revenueLedgerQuery,
  positionsQuery,
  allocatorHealthQuery,
  loveStatsQuery,
  opportunitiesQuery,
  usageQuery,
  donationsQuery,
  btcpayStoresQuery,
  btcpayInvoicesQuery,
  queryKeys,
} from '../lib/api/queries';
import { revenueTrend } from '../lib/trends';
import { formatCurrency } from '../lib/formatters';
import type { MetricStatus } from './StatusBadge';
import type { WidgetId } from '../lib/widgets';

/** Maps a TanStack Query result to the five-state metric status. */
export function queryStatus(q: Pick<UseQueryResult, 'isPending' | 'isError' | 'isFetching' | 'isStale' | 'data'>): {
  status: MetricStatus;
  lastUpdated: Date | null;
} {
  if (q.isPending) return { status: 'loading', lastUpdated: null };
  if (q.isError) return { status: 'error', lastUpdated: null };
  if (q.data == null) return { status: 'empty', lastUpdated: null };
  if (q.isStale && !q.isFetching) return { status: 'stale', lastUpdated: null };
  return { status: 'live', lastUpdated: null };
}

/** Query → live/stale freshness timestamp. */
function fresh(q: UseQueryResult): Date | null {
  return q.dataUpdatedAt ? new Date(q.dataUpdatedAt) : null;
}

/** Capacity-driven data density: below spoon 3, hide trend/delta context. */
export function useTrendGated() {
  const spoons = useSpoonsStore((s) => s.spoons);
  return spoons >= 3;
}

export function WidgetTile({ id }: { id: WidgetId }) {
  switch (id) {
    case 'revenue':
      return <RevenueTile />;
    case 'positions':
      return <PositionsTile />;
    case 'allocator':
      return <AllocatorTile />;
    case 'love':
      return <LoveTile />;
    case 'opportunities':
      return <OpportunitiesTile />;
    case 'usage':
      return <UsageTile />;
    case 'donations':
      return <DonationsTile />;
    case 'btcpay':
      return <BtcpayTile />;
  }
}

function RevenueTile() {
  const q = useQuery(revenueSummaryQuery());
  const ledger = useQuery(revenueLedgerQuery(500));
  useLiveSurface('revenue', queryKeys.revenue.summary('30d'));
  const showTrend = useTrendGated();
  const trend = showTrend && ledger.data ? revenueTrend(ledger.data.entries) : { delta: null, sparkline: [] };
  const st = queryStatus(q);
  return (
    <MetricCard
      label="Revenue"
      value={`$${formatCurrency(q.data?.total_usdc ?? 0)}`}
      sub={q.data ? `${q.data.count} transactions` : '…'}
      accent="cyan"
      status={st.status}
      lastUpdated={fresh(q) ?? fresh(ledger)}
      delta={trend.delta}
      sparkline={trend.sparkline}
    />
  );
}

function PositionsTile() {
  const q = useQuery(positionsQuery);
  useLiveSurface('positions', queryKeys.positions.list());
  const positions = q.data?.positions ?? [];
  const deposited = positions.reduce((s, p) => s + parseFloat(p.amount || '0'), 0);
  const st = queryStatus(q);
  return (
    <MetricCard
      label="Positions"
      value={`${positions.length}`}
      sub={`$${formatCurrency(deposited)} deposited`}
      accent="green"
      status={st.status}
      lastUpdated={fresh(q)}
    />
  );
}

function AllocatorTile() {
  const q = useQuery(allocatorHealthQuery);
  const st = queryStatus(q);
  const live = q.data?.status === 'ok';
  return (
    <MetricCard
      label="Allocator"
      value={live ? 'Healthy' : q.data?.status ?? '…'}
      sub={q.data ? `ROI 30d: ${formatCurrency(q.data.roi_30d)}` : '…'}
      accent={live ? 'green' : 'red'}
      status={st.status}
      lastUpdated={fresh(q)}
    />
  );
}

function LoveTile() {
  const q = useQuery(loveStatsQuery);
  const st = queryStatus(q);
  return (
    <MetricCard
      label="LOVE Token"
      value={q.data?.total_love ?? '…'}
      sub={q.data ? `${q.data.transaction_count} harvests` : '…'}
      accent="violet"
      status={st.status}
      lastUpdated={fresh(q)}
    />
  );
}

function OpportunitiesTile() {
  const q = useQuery(opportunitiesQuery());
  useLiveSurface('opportunities', queryKeys.opportunities.list());
  const st = queryStatus(q);
  return (
    <MetricCard
      label="Opportunities"
      value={q.data?.opportunities.length ?? 0}
      sub="MEV signals"
      accent="gold"
      status={st.status}
      lastUpdated={fresh(q)}
    />
  );
}

function UsageTile() {
  const q = useQuery(usageQuery(30));
  const st = queryStatus(q);
  const sparkline = useTrendGated() ? (q.data?.by_day ?? []).map((d) => d.calls) : [];
  return (
    <MetricCard
      label="Usage (30d)"
      value={q.data?.total_calls ?? 0}
      sub={`$${formatCurrency(q.data?.total_cost_usdc ?? '0')}`}
      accent="cyan"
      status={st.status}
      lastUpdated={fresh(q)}
      sparkline={sparkline}
    />
  );
}

function DonationsTile() {
  const q = useQuery(donationsQuery);
  const st = queryStatus(q);
  const totalBtc = (q.data ?? []).reduce((s, d) => s + parseFloat(d.amount || '0'), 0);
  return (
    <MetricCard
      label="Donations"
      value={q.data?.length ?? 0}
      sub={`${formatCurrency(totalBtc)} BTC`}
      accent="violet"
      status={st.status}
      lastUpdated={fresh(q)}
    />
  );
}

function BtcpayTile() {
  const stores = useQuery(btcpayStoresQuery);
  const invoices = useQuery(btcpayInvoicesQuery);
  const st = queryStatus(invoices);
  const settled = (invoices.data?.invoices ?? []).filter((i) => i.status === 'Settled').length;
  const store = stores.data?.stores?.[0];
  return (
    <MetricCard
      label="BTCPay"
      value={store?.name ?? 'BTCPay'}
      sub={`${settled} settled · ${invoices.data?.invoices.length ?? 0} invoices`}
      accent="gold"
      status={stores.isError ? 'error' : st.status}
      lastUpdated={invoices.dataUpdatedAt ? new Date(invoices.dataUpdatedAt) : null}
    />
  );
}

export default WidgetTile;