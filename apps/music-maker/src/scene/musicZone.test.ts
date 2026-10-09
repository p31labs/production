import { describe, expect, it } from 'vitest';
import { phyllotaxisPosition, zoneGlow, makeZone, posnerSitePosition } from './musicZone';

describe('phyllotaxisPosition', () => {
  it('lays N zones on a sphere of the given radius', () => {
    const N = 12;
    const r = 2.2;
    for (let i = 0; i < N; i++) {
      const [x, y, z] = phyllotaxisPosition(i, N, r);
      const dist = Math.hypot(x, y, z);
      expect(dist).toBeGreaterThan(r * 0.999);
      expect(dist).toBeLessThan(r * 1.001);
    }
  });

  it('is deterministic per (index, count, radius)', () => {
    const a = phyllotaxisPosition(4, 12, 2.2);
    const b = phyllotaxisPosition(4, 12, 2.2);
    expect(a).toEqual(b);
  });

  it('covers the full vertical range (so height→pitch has range to encode)', () => {
    const N = 16;
    const ys = Array.from({ length: N }, (_, i) => phyllotaxisPosition(i, N, 2.2)[1]);
    expect(Math.max(...ys)).toBeCloseTo(2.2, 1);
    expect(Math.min(...ys)).toBeCloseTo(-2.2, 1);
  });
});

describe('zoneGlow — the @p31ca/field decay curve reuse', () => {
  it('returns 1 at the trigger moment and decays exponentially', () => {
    const at = Date.now();
    const glow0 = zoneGlow({ zone: 'z', ts: at, actor: 'human' }, at);
    const glowLater = zoneGlow({ zone: 'z', ts: at, actor: 'human' }, at + 1400);
    expect(glow0).toBeCloseTo(1, 5);
    expect(glowLater).toBeCloseTo(0.5, 5); // one half-life later
  });

  it('is deterministic — same inputs, same glow', () => {
    const at = Date.now();
    const a = zoneGlow({ zone: 'z', ts: at, actor: 'human' }, at + 700);
    const b = zoneGlow({ zone: 'z', ts: at, actor: 'human' }, at + 700);
    expect(a).toEqual(b);
  });
});

describe('makeZone', () => {
  it('falls back to the id as the display name', () => {
    expect(makeZone('zone:abc', [0, 0, 1]).name).toBe('zone:abc');
    expect(makeZone('zone:abc', [0, 0, 1], 'hydrogen', 'the sun').name).toBe('the sun');
  });
});

describe('posnerSitePosition', () => {
  it('places the first six zones on the six phosphorus sites (axis octahedron)', () => {
    const r = 2.2;
    const scale = r / 1.28;
    expect(posnerSitePosition(0, r)).toEqual([1.28 * scale, 0, 0]);
    expect(posnerSitePosition(1, r)).toEqual([-1.28 * scale, 0, 0]);
    expect(posnerSitePosition(3, r)).toEqual([0, -1.28 * scale, 0]);
    expect(posnerSitePosition(5, r)).toEqual([0, 0, -1.28 * scale]);
  });

  it('falls back to phyllotaxis past the six phosphorus (the field beyond the molecule)', () => {
    const r = 2.2;
    const beyond = posnerSitePosition(6, r);
    const expected = phyllotaxisPosition(0, 10, r);
    expect(beyond).toEqual(expected);
  });
});