/**
 * Enforcement-guard spike detection tests.
 */

import { describe, it, expect } from 'vitest';
import { isEnforceSpike } from '../../enforcement-guard/index';

describe('isEnforceSpike', () => {
  it('no spike when recent enforce refusals are within the baseline', () => {
    // baseline 96/24h ≈ 1 per window → spike needs > 3 recent.
    expect(isEnforceSpike(2, 96)).toBe(false);
    expect(isEnforceSpike(3, 96)).toBe(false);
  });

  it('spikes when recent enforce refusals exceed 3x the per-window baseline', () => {
    expect(isEnforceSpike(4, 96)).toBe(true);
  });

  it('spikes on a burst when the observe baseline is empty', () => {
    // No observe baseline → a burst of ≥ MIN_SPIKE_COUNT still fires.
    expect(isEnforceSpike(4, 0)).toBe(true);
    // A single refusal without a baseline is NOT a spike.
    expect(isEnforceSpike(1, 0)).toBe(false);
  });

  it('never fires on an empty window', () => {
    expect(isEnforceSpike(0, 0)).toBe(false);
    expect(isEnforceSpike(0, 500)).toBe(false);
  });
});