import { queryOptions } from '@tanstack/react-query';
import { api } from '../../api/client';
import { configApi } from '../../api/config';
import { queryKeys } from './queryKeys';

export { queryKeys };

/** SSE surface names — must match the worker /api/stream event names. */
export type LiveSurface = 'revenue' | 'positions' | 'opportunities';

/** Default freshness window (s). Query is served from cache within this. */
export const STALE_TIME = 30_000;
export const POLL_INTERVAL = 30_000;

export const revenueSummaryQuery = (range = '30d') =>
  queryOptions({
    queryKey: queryKeys.revenue.summary(range),
    queryFn: () => api.getRevenueSummary(),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

export const revenueLedgerQuery = (limit = 500) =>
  queryOptions({
    queryKey: queryKeys.revenue.ledger(limit),
    queryFn: () => api.getRevenueLedger(limit),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

export const revenueVerifyQuery = queryOptions({
  queryKey: queryKeys.revenue.verify(),
  queryFn: () => api.verifyRevenueChain(),
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export const allocatorHealthQuery = queryOptions({
  queryKey: queryKeys.allocator.health(),
  queryFn: () => api.getAllocatorStatus(),
  staleTime: STALE_TIME,
  refetchInterval: 60_000,
  refetchOnWindowFocus: true,
});

export const positionsQuery = queryOptions({
  queryKey: queryKeys.positions.list(),
  queryFn: () => api.getPositions(),
  staleTime: STALE_TIME,
  refetchInterval: POLL_INTERVAL,
  refetchOnWindowFocus: true,
});

export const opportunitiesQuery = (chain?: string) =>
  queryOptions({
    queryKey: queryKeys.opportunities.list(chain),
    queryFn: () => api.getOpportunities(chain),
    staleTime: STALE_TIME,
    refetchInterval: POLL_INTERVAL,
    refetchOnWindowFocus: true,
  });

export const loveStatsQuery = queryOptions({
  queryKey: queryKeys.love.stats(),
  queryFn: () => api.getLoveHarvest(),
  staleTime: STALE_TIME,
  refetchInterval: 60_000,
});

export const usageQuery = (range: number) =>
  queryOptions({
    queryKey: queryKeys.usage.stats(range),
    queryFn: async () => {
      const res = await fetch(`/api/usage?range=${range}`);
      if (!res.ok) throw new Error('Usage fetch failed');
      return res.json() as Promise<{
        range_days: number;
        total_calls: number;
        total_cost_usdc: string;
        avg_latency_ms: number;
        by_endpoint: { endpoint: string; calls: number }[];
        by_day: { day: number; calls: number }[];
      }>;
    },
    staleTime: STALE_TIME,
    refetchInterval: 60_000,
  });

export const donationsQuery = queryOptions({
  queryKey: queryKeys.donations.list(),
  queryFn: async () => {
    const res = await fetch('/api/btcpay/donations');
    if (!res.ok) throw new Error('Failed to load donations');
    const json = await res.json();
    return (json.donations ?? []) as import('../../api/client').BtcpayDonation[];
  },
  staleTime: STALE_TIME,
  refetchInterval: 60_000,
});

export const btcpayInvoicesQuery = queryOptions({
  queryKey: queryKeys.btcpay.invoices(),
  queryFn: () => api.getBtcpayInvoices(),
  staleTime: STALE_TIME,
  refetchInterval: 30_000,
  refetchOnWindowFocus: true,
});

export const btcpayStoresQuery = queryOptions({
  queryKey: queryKeys.btcpay.stores(),
  queryFn: () => api.getBtcpayStores(),
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
});

export interface SbtRecord {
  id: string;
  type: string;
  did: string;
  metadata: string | null;
  tetrahedron_hash: string | null;
  prev_hash: string | null;
  hash: string;
  loom_anchor_hash: string | null;
  anchored: number;
  issued_at: number;
}

export const sbtListQuery = (did: string) =>
  queryOptions({
    queryKey: queryKeys.sbt.list(did),
    queryFn: async () => {
      const res = await fetch(`/api/sbt/list?did=${encodeURIComponent(did)}`);
      if (!res.ok) throw new Error('SBT list failed');
      const json = (await res.json()) as { sbts?: SbtRecord[] };
      return (json.sbts ?? []) as SbtRecord[];
    },
    staleTime: 60_000,
    enabled: !!did,
  });

export interface DoraMetrics {
  deploy_frequency: { total: number; per_day: { day: number; deploys: number }[] };
  lead_time: { median: number | null; p75: number | null };
  change_failure_rate: number | null;
  mttr: { median: number | null };
  window_days: number;
}

export const doraMetricsQuery = queryOptions({
  queryKey: queryKeys.dora.metrics(),
  queryFn: async () => {
    const res = await fetch('/api/dora/metrics?service=all&days=7');
    if (!res.ok) throw new Error('DORA metrics failed');
    const json = (await res.json()) as { metrics?: DoraMetrics };
    return (json.metrics ?? null) as DoraMetrics | null;
  },
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export interface SloSnapshot {
  target: number;
  window_minutes: number;
  availability: number | null;
  p95_ms: number | null;
  p99_ms: number | null;
  total_calls: number;
  ok_calls: number;
  error_budget_minutes: number;
  burned_budget: number;
  budget_remaining_pct: number;
  burn_rate: 'fast' | 'slow' | 'ok';
  recorded_at: number | null;
}

export const sloMetricsQuery = queryOptions({
  queryKey: queryKeys.dora.metrics(),
  queryFn: async () => {
    const res = await fetch('/api/slo/metrics');
    if (!res.ok) throw new Error('SLO metrics failed');
    const json = (await res.json()) as { slo?: SloSnapshot | null };
    return (json.slo ?? null) as SloSnapshot | null;
  },
  staleTime: 60_000,
  refetchInterval: 60_000,
});

export const configQuery = queryOptions({
  queryKey: queryKeys.config.list(),
  queryFn: () => configApi.getConfig(),
  staleTime: 5 * 60_000,
});

export const configFlagsQuery = queryOptions({
  queryKey: queryKeys.config.flags(),
  queryFn: () => configApi.getFlags(),
  staleTime: 5 * 60_000,
});

export interface InvariantCheck {
  name: string;
  status: 'ok' | 'fail';
  detail: string;
}

export const invariantsQuery = queryOptions({
  queryKey: queryKeys.ops.invariants(),
  queryFn: async () => {
    const res = await fetch('/api/health/invariants');
    const body = (await res.json()) as { invariants: InvariantCheck[]; healthy: boolean };
    return body;
  },
  staleTime: 30_000,
  refetchInterval: 60_000,
});

export interface McpToolPricing {
  price_usdc: string;
  description: string;
}

export const mcpPricingQuery = queryOptions({
  queryKey: queryKeys.ops.mcpPricing(),
  queryFn: async () => {
    const res = await fetch('https://p31-capital-machine-mcp.trimtab-signal.workers.dev/.well-known/mcp-pricing');
    if (!res.ok) throw new Error('MCP pricing unreachable');
    return res.json() as Promise<{
      currency: string;
      network: string;
      pay_to: string;
      tools: Record<string, McpToolPricing>;
    }>;
  },
  staleTime: 5 * 60_000,
  refetchInterval: 5 * 60_000,
});