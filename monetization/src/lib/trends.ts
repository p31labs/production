import type { RevenueEntry } from '../api/client';

const DAY_MS = 86_400_000;

export interface Trend {
  /** percent change, last 7d vs prior 7d; null when no comparable data */
  delta: number | null;
  /** per-day USDC totals for the last 7 days (oldest → newest) */
  sparkline: number[];
}

/**
 * Derives a revenue trend from ledger entries:
 * buckets by day, computes a 7-day sparkline and a % delta vs the prior 7 days.
 */
export function revenueTrend(entries: RevenueEntry[]): Trend {
  if (!entries || entries.length === 0) return { delta: null, sparkline: [] };

  const now = Date.now();
  const buckets = new Map<number, number>();
  for (const e of entries) {
    const day = Math.floor(e.created_at * 1000 / DAY_MS);
    buckets.set(day, (buckets.get(day) ?? 0) + (parseFloat(e.amount_usdc) || 0));
  }

  const dayKeys = [...buckets.keys()].sort((a, b) => a - b);
  const today = Math.floor(now / DAY_MS);
  const oldestDay = today - 6;

  const sparkline: number[] = [];
  for (let d = oldestDay; d <= today; d += 1) {
    sparkline.push(buckets.get(d) ?? 0);
  }

  const last7 = sparkline.reduce((a, b) => a + b, 0);
  const prior7 = dayKeys
    .filter((k) => k >= oldestDay - 7 && k < oldestDay)
    .reduce((sum, k) => sum + (buckets.get(k) ?? 0), 0);

  let delta: number | null = null;
  if (prior7 > 0) {
    delta = ((last7 - prior7) / prior7) * 100;
  }

  return { delta, sparkline };
}

/** Percent change helper for scalar comparisons. */
export function pctDelta(current: number, prior: number): number | null {
  if (!prior) return null;
  return ((current - prior) / prior) * 100;
}