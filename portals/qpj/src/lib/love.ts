export type LoveSource = 'talk' | 'milestone' | 'artifact' | 'identity' | 'mesh' | 'care' | 'music';

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
  music: 1,
};

/** The ethical-gamification guards for the instrument. No streaks, no loss
 *  aversion, no "come back tomorrow" — rewards are capped and cooldown-gated
 *  so a child mashing zones cannot farm LOVE, and collaboration (playing a
 *  zone someone else placed) is what earns, not solo grinding. */
export const MUSIC_SESSION_WINDOW_MS = 30 * 60_000; // rewards reset each 30 min
export const MUSIC_MAX_PER_SESSION = 4;
export const MUSIC_ZONE_COOLDOWN_MS = 60_000; // same zone, no re-reward within a minute
export const MUSIC_SPOONS_FLOOR = 2; // reward only when the player has ≥2 spoons
export const CONSTELLATION_THRESHOLDS = [4, 8, 12, 16];

export function sessionMusicEarned(
  log: LoveEntry[],
  by: string,
  now: number,
  windowMs = MUSIC_SESSION_WINDOW_MS,
): number {
  return log
    .filter((e) => e.source === 'music' && e.kind === 'earn' && e.by === by && now - e.at < windowMs)
    .reduce((s, e) => s + e.amount, 0);
}

/** Pure: has this zone been rewarded to `by` within the cooldown window? */
export function musicZoneOnCooldown(
  log: LoveEntry[],
  by: string,
  zoneId: string,
  now: number,
  cooldownMs = MUSIC_ZONE_COOLDOWN_MS,
): boolean {
  return log.some(
    (e) => e.source === 'music' && e.kind === 'earn' && e.by === by && e.to === zoneId && now - e.at < cooldownMs,
  );
}

/** Pure: the gated LOVE amount for playing a zone someone else placed.
 *  Returns 0 when the player is at/below the spoons floor, over the session
 *  cap, or re-triggering a zone inside its cooldown. */
export function musicReward(
  log: LoveEntry[],
  by: string,
  zoneId: string,
  spoons: number,
  now: number,
): number {
  if (spoons < MUSIC_SPOONS_FLOOR) return 0;
  if (sessionMusicEarned(log, by, now) >= MUSIC_MAX_PER_SESSION) return 0;
  if (musicZoneOnCooldown(log, by, zoneId, now)) return 0;
  return LOVE_WEIGHTS.music;
}

/** Pure: which constellation threshold, if any, a zone count has just crossed
 *  (a new threshold above the last awarded one). Monotonic — a threshold only
 *  awards once. Returns the threshold, or 0. */
export function constellationMilestoneHit(count: number, lastAwarded: number): number {
  const next = CONSTELLATION_THRESHOLDS.find((t) => t <= count && t > lastAwarded);
  return next ?? 0;
}

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