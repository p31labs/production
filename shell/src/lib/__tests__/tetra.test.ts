import { describe, it, expect } from 'vitest';
import { regularTetra, assertRegular, icosahedron12 } from '../tetra';

describe('regularTetra', () => {
  const R = 2.4;
  const tetra = regularTetra(R);

  it('returns 4 vertices', () => {
    const { v0, v1, v2, v3 } = tetra;
    const vertices = [v0, v1, v2, v3];
    expect(vertices).toHaveLength(4);
  });

  it('computes correct edgeLength from circumradius', () => {
    expect(tetra.edgeLength).toBeCloseTo(R * Math.sqrt(8 / 3), 6);
  });

  it('all 6 edges have equal length', () => {
    const { v0, v1, v2, v3 } = tetra;
    const d = (a: [number, number, number], b: [number, number, number]) =>
      Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
    const edges = [
      d(v0, v1), d(v0, v2), d(v0, v3),
      d(v1, v2), d(v1, v3), d(v2, v3),
    ];
    for (const edge of edges) {
      expect(edge).toBeCloseTo(tetra.edgeLength, 6);
    }
  });

  it('each vertex is distance R from origin', () => {
    const { v0, v1, v2, v3 } = tetra;
    for (const v of [v0, v1, v2, v3]) {
      const dist = Math.hypot(v[0], v[1], v[2]);
      expect(dist).toBeCloseTo(R, 6);
    }
  });
});

describe('assertRegular', () => {
  it('does not throw for a valid regular tetrahedron', () => {
    const tetra = regularTetra(2.4);
    expect(() => assertRegular(tetra)).not.toThrow();
  });
});

describe('icosahedron12', () => {
  const r = 2.3;
  const points = icosahedron12(r);

  it('returns 12 points', () => {
    expect(points).toHaveLength(12);
  });

  it('every point lies on sphere of radius r', () => {
    for (const [x, y, z] of points) {
      const dist = Math.sqrt(x * x + y * y + z * z);
      expect(dist).toBeCloseTo(r, 6);
    }
  });

  it('no duplicate points', () => {
    const keys = points.map(([x, y, z]) =>
      `${x.toFixed(8)},${y.toFixed(8)},${z.toFixed(8)}`
    );
    expect(new Set(keys).size).toBe(12);
  });
});
