/**
 * QPJ — love.ts music rewards (the ethical-gamification guards).
 *
 * Pins the anti-farm rules: playing a zone someone else placed earns LOVE only
 * when the player is above the spoons floor, under the per-session cap, and
 * off the per-zone cooldown. Constellation milestones are monotonic.
 */
import { describe, expect, it } from 'vitest';
import {
  MUSIC_MAX_PER_SESSION,
  MUSIC_ZONE_COOLDOWN_MS,
  MUSIC_SPOONS_FLOOR,
  musicReward,
  sessionMusicEarned,
  musicZoneOnCooldown,
  constellationMilestoneHit,
  LOVE_WEIGHTS,
  type LoveEntry,
} from '../lib/love';

const NOW = 1_000_000;
const me = 'Dillpickle';
const zone = 'zone:abc';

function earn(by: string, at: number, to?: string): LoveEntry {
  return { id: `e${at}`, at, kind: 'earn', source: 'music', amount: LOVE_WEIGHTS.music, by, to };
}

describe('musicReward', () => {
  it('refuses below the spoons floor (the ethical floor)', () => {
    expect(musicReward([], me, zone, MUSIC_SPOONS_FLOOR - 1, NOW)).toBe(0);
  });

  it('refuses at the per-session cap', () => {
    const log = Array.from({ length: MUSIC_MAX_PER_SESSION }, (_, i) => earn(me, NOW - i * 1000));
    expect(sessionMusicEarned(log, me, NOW)).toBe(MUSIC_MAX_PER_SESSION);
    expect(musicReward(log, me, zone, 5, NOW)).toBe(0);
  });

  it('refuses a zone on cooldown (no mash-farming)', () => {
    const log = [earn(me, NOW - 10_000, zone)];
    expect(musicZoneOnCooldown(log, me, zone, NOW)).toBe(true);
    expect(musicReward(log, me, zone, 5, NOW)).toBe(0);
  });

  it('rewards a fresh collaborative play', () => {
    expect(musicReward([], me, zone, 3, NOW)).toBe(LOVE_WEIGHTS.music);
  });

  it('only counts MY music earns toward my cap', () => {
    const log = [earn(me, NOW - 1000), earn('Cornichon', NOW - 500)];
    expect(sessionMusicEarned(log, me, NOW)).toBe(1);
    expect(musicReward(log, me, zone, 3, NOW)).toBe(LOVE_WEIGHTS.music);
  });
});

describe('constellationMilestoneHit', () => {
  it('is monotonic — a threshold awards once', () => {
    expect(constellationMilestoneHit(4, 0)).toBe(4);
    expect(constellationMilestoneHit(5, 4)).toBe(0); // 4 already awarded
    expect(constellationMilestoneHit(8, 4)).toBe(8);
    expect(constellationMilestoneHit(12, 8)).toBe(12);
    expect(constellationMilestoneHit(16, 12)).toBe(16);
  });

  it('returns 0 below the first threshold', () => {
    expect(constellationMilestoneHit(3, 0)).toBe(0);
  });
});