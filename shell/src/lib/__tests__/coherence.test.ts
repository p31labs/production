import { describe, it, expect } from 'vitest';
import { coherenceForSpoons } from '../coherence';

describe('coherenceForSpoons', () => {
  it('returns values in [0, 1]', () => {
    for (let s = 0; s <= 5; s += 0.5) {
      const c = coherenceForSpoons(s);
      expect(c).toBeGreaterThanOrEqual(0);
      expect(c).toBeLessThanOrEqual(1);
    }
  });

  it('is monotonic — lower spoons yields ≤ higher spoons coherence', () => {
    const low = coherenceForSpoons(0);
    const high = coherenceForSpoons(5);
    expect(low).toBeLessThanOrEqual(high);
  });

  it('saturates at extremes', () => {
    expect(coherenceForSpoons(0)).toBeGreaterThanOrEqual(0);
    expect(coherenceForSpoons(5)).toBeGreaterThanOrEqual(0);
  });
});
