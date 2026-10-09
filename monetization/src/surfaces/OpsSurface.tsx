import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '../components/MetricCard';
import { StatusBanner } from '../components/StatusBanner';
import { queryStatus } from '../components/WidgetTile';
import {
  revenueSummaryQuery,
  revenueLedgerQuery,
  revenueVerifyQuery,
  invariantsQuery,
  mcpPricingQuery,
  btcpayInvoicesQuery,
  doraMetricsQuery,
  sloMetricsQuery,
} from '../lib/api/queries';
import { formatCurrency } from '../lib/formatters';
import type { RevenueEntry } from '../api/client';

/** Curated x402 network context (Foundation reporting) — labeled as reference. */
const NETWORK_CONTEXT = [
  { label: 'Cumulative transactions', value: '200M+' },
  { label: 'Median price per call', value: '$0.028' },
  { label: 'Avg payment size', value: '$0.32' },
  { label: 'Foundation members', value: '40+ (Visa, Mastercard, Stripe, Google, AWS)' },
];

function parseMeta(e: RevenueEntry): Record<string, unknown> | null {
  if (!e.metadata) return null;
  try {
    const parsed = JSON.parse(e.metadata) as Record<string, unknown>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export default function OpsSurface() {
  const revenue = useQuery(revenueSummaryQuery('30d'));
  const ledger = useQuery(revenueLedgerQuery(500));
  const verify = useQuery(revenueVerifyQuery);
  const invariants = useQuery(invariantsQuery);
  const pricing = useQuery(mcpPricingQuery);
  const btcpay = useQuery(btcpayInvoicesQuery);
  const dora = useQuery(doraMetricsQuery);
  const slo = useQuery(sloMetricsQuery);

  const btcInvoices = btcpay.data?.invoices ?? [];
  const btcSettled = btcInvoices.filter((i) => i.status === 'Settled');
  const btcRate = btcInvoices.length > 0 ? (btcSettled.length / btcInvoices.length) * 100 : null;
  const d = dora.data;
  const s = slo.data;

  const st = queryStatus(revenue);

  // Gateway economics from the hash-chained ledger: routing fees + capital ops.
  const entries = ledger.data?.entries ?? [];
  const ops = entries.filter((e) => {
    const meta = parseMeta(e);
    return meta?.operation;
  });
  const fees = ops.reduce((s, e) => s + (parseFloat(e.amount_usdc) || 0), 0);
  const perTool = new Map<string, { count: number; fees: number }>();
  for (const e of ops) {
    const tool = (parseMeta(e)?.tool as string) ?? 'unknown';
    const cur = perTool.get(tool) ?? { count: 0, fees: 0 };
    cur.count += 1;
    cur.fees += parseFloat(e.amount_usdc) || 0;
    perTool.set(tool, cur);
  }

  return (
    <div className="surface-page">
      <header className="surface-head">
        <div>
          <h2 className="surface-title">x402 Ops</h2>
          <p className="surface-sub">
            Settlement observability and runtime invariants — the Capital Machine as x402 infrastructure, not just a dashboard.
          </p>
        </div>
        <div className="surface-actions">
          <span className={`integrity-badge${invariants.data?.healthy === false ? ' integrity-badge--fail' : ''}`}>
            {invariants.isPending ? 'Checking…' : invariants.data?.healthy ? '✓ All invariants green' : '✗ Invariant failure'}
          </span>
        </div>
      </header>

      {invariants.isError && <StatusBanner kind="error">Invariant check unreachable.</StatusBanner>}

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Runtime Invariants</h3>
      <div className="row-list">
        {(invariants.data?.invariants ?? []).map((inv) => (
          <div key={inv.name} className="row-card">
            <div className="row-card__head">
              <span className="row-card__title mono">{inv.name}</span>
              <span className={`badge ${inv.status === 'ok' ? 'badge-spark' : 'badge-workshop'}`}>
                {inv.status === 'ok' ? 'OK' : 'FAIL'}
              </span>
            </div>
            <div className="row-card__meta">{inv.detail}</div>
          </div>
        ))}
        {invariants.data && invariants.data.invariants.length === 0 && (
          <div className="empty-state"><h3>No invariants configured</h3></div>
        )}
      </div>

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Settlement</h3>
      <div className="metric-grid">
        <MetricCard
          label="x402 Settled USDC"
          value={`$${formatCurrency(revenue.data?.total_usdc ?? 0)}`}
          sub="last 30d"
          status={st.status}
          lastUpdated={revenue.dataUpdatedAt ? new Date(revenue.dataUpdatedAt) : null}
        />
        <MetricCard
          label="Settlements"
          value={revenue.data?.count ?? 0}
          sub={`Avg $${formatCurrency(revenue.data?.avg_per_transaction ?? 0)}`}
          accent="gold"
          status={st.status}
          lastUpdated={revenue.dataUpdatedAt ? new Date(revenue.dataUpdatedAt) : null}
        />
        <MetricCard
          label="Hash-chain"
          value={verify.isPending ? '…' : verify.data?.valid ? 'Valid' : 'Broken'}
          sub={verify.data ? `${verify.data.total_entries} entries` : '…'}
          accent={verify.data?.valid ? 'green' : 'red'}
          status={verify.isError ? 'error' : verify.isPending ? 'loading' : 'live'}
          lastUpdated={verify.dataUpdatedAt ? new Date(verify.dataUpdatedAt) : null}
        />
        <MetricCard
          label="MCP Server"
          value={pricing.isError ? 'Offline' : pricing.data ? 'Live' : '…'}
          sub={pricing.data ? `${pricing.data.network} · ${Object.keys(pricing.data.tools).length} paid tools` : '…'}
          accent={pricing.isError ? 'red' : 'green'}
          status={pricing.isError ? 'error' : pricing.isPending ? 'loading' : 'live'}
          lastUpdated={pricing.dataUpdatedAt ? new Date(pricing.dataUpdatedAt) : null}
        />
      </div>

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Gateway Economics</h3>
      <div className="metric-grid">
        <MetricCard
          label="Routing Fees Collected"
          value={`$${formatCurrency(fees)}`}
          sub={`${ops.length} capital operation(s)`}
          accent="gold"
          status={ledger.isPending ? 'loading' : 'live'}
          lastUpdated={ledger.dataUpdatedAt ? new Date(ledger.dataUpdatedAt) : null}
        />
        <MetricCard
          label="Paid Tools"
          value={pricing.data ? Object.keys(pricing.data.tools).length : '…'}
          sub="exposed via MCP"
          accent="violet"
          status={pricing.isError ? 'error' : pricing.isPending ? 'loading' : 'live'}
          lastUpdated={pricing.dataUpdatedAt ? new Date(pricing.dataUpdatedAt) : null}
        />
      </div>
      {perTool.size > 0 && (
        <div className="row-list">
          {[...perTool.entries()].map(([tool, stats]) => (
            <div key={tool} className="row-card">
              <div className="row-card__head">
                <span className="row-card__title mono">{tool}</span>
                <span className="row-card__value">${formatCurrency(stats.fees)}</span>
              </div>
              <div className="row-card__meta">{stats.count} call(s)</div>
            </div>
          ))}
        </div>
      )}

      {pricing.data && (
        <>
          <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>MCP Pricing Exposure</h3>
          <div className="row-list">
            {Object.entries(pricing.data.tools).map(([name, tool]) => (
              <div key={name} className="row-card">
                <div className="row-card__head">
                  <span className="row-card__title mono">{name}</span>
                  <span className="row-card__value">${tool.price_usdc}</span>
                </div>
                <div className="row-card__meta">{tool.description}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>BTCPay Settlement</h3>
      <div className="metric-grid">
        <MetricCard
          label="BTCPay Invoices"
          value={btcInvoices.length}
          sub={`${btcSettled.length} settled`}
          accent="gold"
          status={btcpay.isPending ? 'loading' : btcpay.isError ? 'error' : 'live'}
          lastUpdated={btcpay.dataUpdatedAt ? new Date(btcpay.dataUpdatedAt) : null}
        />
        <MetricCard
          label="Settlement Rate"
          value={btcRate == null ? '—' : `${btcRate.toFixed(0)}%`}
          sub="settled / total"
          accent="green"
          status={btcpay.isPending ? 'loading' : btcpay.isError ? 'error' : 'live'}
          lastUpdated={btcpay.dataUpdatedAt ? new Date(btcpay.dataUpdatedAt) : null}
        />
      </div>

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>DORA</h3>
      <div className="metric-grid">
        <MetricCard
          label="Deploy frequency"
          value={d?.deploy_frequency.total ?? '…'}
          sub="7-day successful deploys"
          accent="cyan"
          status={dora.isPending ? 'loading' : dora.isError ? 'error' : 'live'}
          lastUpdated={dora.dataUpdatedAt ? new Date(dora.dataUpdatedAt) : null}
        />
        <MetricCard
          label="Lead time"
          value={d?.lead_time.median != null ? `${(d.lead_time.median / 3600000).toFixed(1)}h` : '—'}
          sub={d?.lead_time.p75 != null ? `p75 ${(d.lead_time.p75 / 3600000).toFixed(1)}h` : 'median PR→deploy'}
          accent="gold"
          status={dora.isPending ? 'loading' : dora.isError ? 'error' : 'live'}
          lastUpdated={dora.dataUpdatedAt ? new Date(dora.dataUpdatedAt) : null}
        />
        <MetricCard
          label="Change failure rate"
          value={d?.change_failure_rate != null ? `${(d.change_failure_rate * 100).toFixed(1)}%` : '—'}
          sub="30-day rolling"
          accent={d?.change_failure_rate != null && d.change_failure_rate > 0.1 ? 'red' : 'green'}
          status={dora.isPending ? 'loading' : dora.isError ? 'error' : 'live'}
          lastUpdated={dora.dataUpdatedAt ? new Date(dora.dataUpdatedAt) : null}
        />
        <MetricCard
          label="MTTR"
          value={d?.mttr.median != null ? `${(d.mttr.median / 60000).toFixed(0)}m` : '—'}
          sub="median recovery"
          accent="violet"
          status={dora.isPending ? 'loading' : dora.isError ? 'error' : 'live'}
          lastUpdated={dora.dataUpdatedAt ? new Date(dora.dataUpdatedAt) : null}
        />
      </div>

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>SLO — Availability</h3>
      <div className="metric-grid">
        <MetricCard
          label="Availability"
          value={s?.availability != null ? `${(s.availability * 100).toFixed(3)}%` : '…'}
          sub={`target 99.9% · ${s?.window_minutes ?? 90}min window`}
          accent={s?.availability != null && s.availability < 0.999 ? 'red' : 'green'}
          status={slo.isPending ? 'loading' : slo.isError ? 'error' : s ? 'live' : 'empty'}
          lastUpdated={s?.recorded_at ? new Date(s.recorded_at) : null}
        />
        <MetricCard
          label="Error budget"
          value={s?.budget_remaining_pct != null ? `${s.budget_remaining_pct}%` : '…'}
          sub={`${s?.error_budget_minutes ?? 43} min/month allowance`}
          accent={s?.burn_rate === 'fast' ? 'red' : s?.burn_rate === 'slow' ? 'gold' : 'green'}
          status={slo.isPending ? 'loading' : slo.isError ? 'error' : s ? 'live' : 'empty'}
          lastUpdated={s?.recorded_at ? new Date(s.recorded_at) : null}
        />
        <MetricCard
          label="Burn rate"
          value={s ? s.burn_rate : '…'}
          sub={s ? `budget fraction ${(s.burned_budget ?? 0).toFixed(2)}` : 'no snapshot yet'}
          accent={s?.burn_rate === 'fast' ? 'red' : s?.burn_rate === 'slow' ? 'gold' : 'green'}
          status={slo.isPending ? 'loading' : slo.isError ? 'error' : s ? 'live' : 'empty'}
          lastUpdated={s?.recorded_at ? new Date(s.recorded_at) : null}
        />
        <MetricCard
          label="Latency"
          value={s?.p95_ms != null ? `${s.p95_ms}ms` : '…'}
          sub={s?.p99_ms != null ? `p99 ${s.p99_ms}ms` : 'p95'}
          accent="cyan"
          status={slo.isPending ? 'loading' : slo.isError ? 'error' : s ? 'live' : 'empty'}
          lastUpdated={s?.recorded_at ? new Date(s.recorded_at) : null}
        />
      </div>

      <h3 className="surface-card-title" style={{ marginBottom: 'var(--p31-space-3)' }}>Network Context</h3>
      <p className="surface-sub" style={{ marginBottom: 'var(--p31-space-3)' }}>
        Reference figures from x402 Foundation reporting — the machine is one node on a protocol backed by Visa, Mastercard, Stripe, Google, AWS, and 40+ members.
      </p>
      <div className="metric-grid">
        {NETWORK_CONTEXT.map((n) => (
          <MetricCard key={n.label} label={n.label} value={n.value} sub="network reference" accent="violet" status="stale" />
        ))}
      </div>
    </div>
  );
}