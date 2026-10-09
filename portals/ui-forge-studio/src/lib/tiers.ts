/**
 * tiers.ts — the pricing plans + tier helpers (Wave 3).
 *
 * This module is shared by the client (tier pill, upgrade prompt) and the
 * `/api/billing/tiers` Pages Function (which returns the same table). It is a
 * pure-data module — no browser-only APIs outside guarded helpers — so it can
 * be bundled into both.
 *
 * The ENTITLEMENT worker (built in parallel) enforces quotas per DID; this
 * table is the display contract that mirrors what it serves.
 */

export type PlanId = 'free' | 'pro' | 'team' | 'enterprise';

export interface Plan {
  id: PlanId;
  name: string;
  /** Monthly price in USD; null = custom/contact. */
  priceUsd: number | null;
  priceLabel: string;
  /** Monthly run allowance; null = custom/unlimited. */
  runs: number | null;
  /** Seat count; null = custom. */
  seats: number | null;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    priceLabel: '$0',
    runs: 5,
    seats: 1,
    features: ['5 runs / month', 'Catalog-walk tier only'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 29,
    priceLabel: '$29/mo',
    runs: 50,
    seats: 1,
    features: ['50 runs / month', 'Audit-log export'],
  },
  team: {
    id: 'team',
    name: 'Team',
    priceUsd: 99,
    priceLabel: '$99/mo',
    runs: 250,
    seats: 5,
    features: ['250 pooled runs / month', '5 seats', 'Compliance export'],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    priceUsd: null,
    priceLabel: 'Custom',
    runs: null,
    seats: null,
    features: ['Custom run allowance', 'SSO + dedicated support'],
  },
};

export const PLAN_ORDER: PlanId[] = ['free', 'pro', 'team', 'enterprise'];

export function planForTier(tier: PlanId | string | null | undefined): Plan {
  if (tier && tier in PLANS) return PLANS[tier as PlanId];
  return PLANS.free;
}

export function isProPlus(tier: PlanId | string | null | undefined): boolean {
  const t = tier as PlanId;
  return t === 'pro' || t === 'team' || t === 'enterprise';
}

const TIER_CACHE_KEY = 'p31:ui-forge:tier';

interface TierCacheEntry {
  did: string;
  tier: PlanId;
}

function storage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // storage unavailable
  }
  return null;
}

/** The studio's cached tier for a did (the server's /api/billing/tiers is the
 *  source of truth; this is the warm read for the pill before it resolves). */
export function tierFor(did: string | null | undefined): PlanId {
  if (!did) return 'free';
  const ls = storage();
  if (!ls) return 'free';
  try {
    const raw = ls.getItem(TIER_CACHE_KEY);
    if (!raw) return 'free';
    const entry = JSON.parse(raw) as TierCacheEntry;
    if (entry.did === did && entry.tier in PLANS) return entry.tier;
  } catch {
    // corrupt cache — ignore
  }
  return 'free';
}

export function cacheTier(did: string, tier: PlanId): void {
  const ls = storage();
  if (!ls) return;
  try {
    ls.setItem(TIER_CACHE_KEY, JSON.stringify({ did, tier }));
  } catch {
    // ignore
  }
}