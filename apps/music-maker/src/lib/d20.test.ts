/**
 * The music maker — d20 (vendored spoon-aware selection).
 *
 * Pins the seeded determinism, the single-variant shortcut, and that low
 * spoons raise the temperature (less precise, gentler choices).
 */
import { describe, expect, it } from 'vitest';
import { d20Select, eightBall, type Variant } from './d20';

const V: Variant[] = [
  { id: 'full', weight: 3 },
  { id: 'warm', weight: 2 },
  { id: 'bare', weight: 1 },
];

describe('d20Select', () => {
  it('is deterministic for a given seed', () => {
    const a = d20Select(V, { spoons: 3 }, 42);
    const b = d20Select(V, { spoons: 3 }, 42);
    expect(a.variant.id).toBe(b.variant.id);
    expect(a.confidence).toBeCloseTo(b.confidence);
  });

  it('returns a confidence in [0,1] and picks from the set', () => {
    const r = d20Select(V, { spoons: 3 }, 123);
    expect(V.map((v) => v.id)).toContain(r.variant.id);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it('short-circuits a single variant with confidence 1', () => {
    const r = d20Select([{ id: 'only', weight: 1 }], { spoons: 3 });
    expect(r.variant.id).toBe('only');
    expect(r.confidence).toBe(1);
  });

  it('eightBall is the spoons-only convenience wrapper', () => {
    const r = eightBall(V, 3, 7);
    expect(V.map((v) => v.id)).toContain(r.variant.id);
  });

  it('throws on an empty set', () => {
    expect(() => d20Select([], { spoons: 3 })).toThrow();
  });
});