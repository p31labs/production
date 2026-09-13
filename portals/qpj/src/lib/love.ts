export type LoveSource = 'talk' | 'milestone' | 'artifact' | 'identity' | 'mesh' | 'care';

export interface LoveEntry {
  id: string;
  at: number;
  kind: 'earn' | 'spend';
  source: LoveSource;
  amount: number;
  by: string;
  to?: string;
}

export const LOVE_WEIGHTS: Record<LoveSource, number> = {
  talk: 1,
  milestone: 2,
  artifact: 2,
  identity: 3,
  mesh: 0.5,
  care: 1,
};

export const LOVE_CARE_FLOOR = 0.1;
export const LOVE_CARE_MAX = 1;
export const LOVE_CARE_BUMP = 0.02;
export const LOVE_CARE_IDLE_DAYS = 7;
export const LOVE_CARE_DECAY_PER_DAY = 0.05;
export const LOVE_LOG_MAX = 40;
export const DAY_MS = 86_400_000;

export interface LoveState {
  sovereignty: number;
  performance: number;
  careScore: number;
  lastCareAt: number;
  log: LoveEntry[];
}

export function initialLove(now = Date.now()): LoveState {
  return {
    sovereignty: 0,
    performance: 0,
    careScore: LOVE_CARE_FLOOR,
    lastCareAt: now,
    log: [],
  };
}

export function pruneLoveLog(log: LoveEntry[], max = LOVE_LOG_MAX): LoveEntry[] {
  return log.slice(-max);
}

export function decayedCareScore(careScore: number, lastCareAt: number, now: number): number {
  const idleDays = Math.max(0, now - lastCareAt) / DAY_MS;
  if (idleDays <= LOVE_CARE_IDLE_DAYS) return careScore;
  const decayed = careScore - (idleDays - LOVE_CARE_IDLE_DAYS) * LOVE_CARE_DECAY_PER_DAY;
  return Math.max(LOVE_CARE_FLOOR, decayed);
}

export function warmedCareScore(careScore: number): number {
  return Math.min(LOVE_CARE_MAX, careScore + LOVE_CARE_BUMP);
}

export function careGatedAmount(weight: number, careScore: number): number {
  return weight * Math.max(LOVE_CARE_FLOOR, careScore);
}

export function splitEarn(amount: number): { sovereignty: number; performance: number } {
  return { sovereignty: amount / 2, performance: amount / 2 };
}

export function roundTrunc(n: number, places = 2): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}