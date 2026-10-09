import type { SectionId } from './nav';
import {
  revenueSummaryQuery,
  positionsQuery,
  opportunitiesQuery,
  btcpayInvoicesQuery,
  donationsQuery,
  usageQuery,
  doraMetricsQuery,
  invariantsQuery,
  configQuery,
  mcpPricingQuery,
} from './api/queries';

/**
 * Lazy route loaders — mirror the App.tsx dynamic imports so prefetching a
 * route chunk here warms the exact same module the router will use.
 */
export const ROUTE_LOADERS: Partial<Record<SectionId, () => Promise<unknown>>> = {
  home: () => import('../surfaces/HomeSurface'),
  revenue: () => import('../surfaces/RevenueSurface'),
  positions: () => import('../surfaces/PositionsSurface'),
  opportunities: () => import('../surfaces/OpportunitiesSurface'),
  invoices: () => import('../surfaces/InvoicesSurface'),
  donations: () => import('../surfaces/DonationsSurface'),
  billing: () => import('../surfaces/BillingSurface'),
  usage: () => import('../surfaces/UsageSurface'),
  ops: () => import('../surfaces/OpsSurface'),
  settings: () => import('../surfaces/SettingsSurface'),
  profile: () => import('../surfaces/ProfileSurface'),
  trust: () => import('../surfaces/TrustSurface'),
  community: () => import('../surfaces/CommunitySurface'),
};

/**
 * Primary query per surface — what the user sees first on arrival. Prefetching
 * these warms the exact cache keys the surfaces read. DID-scoped queries
 * (sbtListQuery) are intentionally excluded; they need the live DID.
 */
export const PRIMARY_QUERY = {
  home: configQuery,
  revenue: revenueSummaryQuery('30d'),
  positions: positionsQuery,
  opportunities: opportunitiesQuery(),
  invoices: btcpayInvoicesQuery,
  donations: donationsQuery,
  usage: usageQuery(30),
  ops: doraMetricsQuery,
  trust: invariantsQuery,
  community: doraMetricsQuery,
  settings: mcpPricingQuery,
} satisfies Partial<Record<SectionId, unknown>>;

/** The four flagship surfaces — prefetched on idle so mobile tabs are instant. */
export const FLAGSHIP_IDS: SectionId[] = ['home', 'revenue', 'positions', 'opportunities'];