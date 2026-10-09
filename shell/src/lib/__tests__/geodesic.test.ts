import { describe, it, expect } from 'vitest';
import {
  icosahedronGeodesic,
  icosahedronVertices,
  icosahedronEdges,
  icosahedronFaces,
  nearestPairs,
  skewStruts,
} from '../geodesic';
import { icosahedron12 } from '../tetra';

const V = 1;
const D0 = icosahedronGeodesic(V, 0);
const D1 = icosahedronGeodesic(V, 1);
const D2 = icosahedronGeodesic(V, 2);

describe('icosahedronGeodesic topology', () => {
  it('base (detail 0) is the 12-vertex / 20-face icosahedron', () => {
    expect(D0.vertices).toHaveLength(12);
    expect(D0.faces).toHaveLength(20);
    expect(D0.edges).toHaveLength(30);
  });

  it('detail 1 yields 42 vertices, 80 faces, 120 edges (THREE parity)', () => {
    expect(D1.vertices).toHaveLength(42);
    expect(D1.faces).toHaveLength(80);
    expect(D1.edges).toHaveLength(120);
  });

  it('detail 2 yields 162 vertices, 320 faces, 480 edges (THREE parity)', () => {
    expect(D2.vertices).toHaveLength(162);
    expect(D2.faces).toHaveLength(320);
    expect(D2.edges).toHaveLength(480);
  });

  it('every vertex lies on the sphere of the given radius', () => {
    for (const [x, y, z] of D2.vertices) {
      expect(Math.hypot(x, y, z)).toBeCloseTo(V, 6);
    }
  });

  it('edges are unique and reference valid distinct vertices', () => {
    for (const [a, b] of D2.edges) {
      expect(a).not.toBe(b);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(D2.vertices.length);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(D2.vertices.length);
    }
    const keys = D2.edges.map(([a, b]) => `${a},${b}`);
    expect(new Set(keys).size).toBe(D2.edges.length);
  });

  it('subdivided edge lengths are near-uniform (within ±20% of mean)', () => {
    for (const g of [D1, D2]) {
      const d = (x: number, y: number) =>
        Math.hypot(
          g.vertices[x][0] - g.vertices[y][0],
          g.vertices[x][1] - g.vertices[y][1],
          g.vertices[x][2] - g.vertices[y][2],
        );
      const lens = g.edges.map(([a, b]) => d(a, b));
      const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
      for (const l of lens) {
        expect(l).toBeGreaterThan(mean * 0.8);
        expect(l).toBeLessThan(mean * 1.2);
      }
      // radius of every vertex is exactly the sphere radius
      for (const v of g.vertices) expect(Math.hypot(...v)).toBeCloseTo(1, 6);
    }
  });

  it('every face is a triangle of valid indices', () => {
    for (const [a, b, c] of D2.faces) {
      expect(a).not.toBe(b);
      expect(b).not.toBe(c);
      expect(a).not.toBe(c);
    }
  });
});

describe('convenience accessors', () => {
  it('icosahedronVertices / Edges / Faces mirror the geodesic build', () => {
    expect(icosahedronVertices(1, 1)).toEqual(D1.vertices);
    expect(icosahedronEdges(1, 1)).toEqual(D1.edges);
    expect(icosahedronFaces(1, 1)).toEqual(D1.faces);
  });
});

describe('nearestPairs', () => {
  it('posner icosahedron (r=2.3) has 30 near-neighbor chords within 2.5', () => {
    const pts = icosahedron12(2.3);
    const pairs = nearestPairs(pts, 2.5);
    expect(pairs).toHaveLength(30);
  });

  it('pair endpoints are distinct and unique', () => {
    const pts = icosahedron12(2.3);
    const pairs = nearestPairs(pts, 2.5);
    const keys = pairs.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`);
    expect(new Set(keys).size).toBe(pairs.length);
    for (const [a, b] of pairs) expect(a).not.toBe(b);
  });
});

describe('skewStruts', () => {
  it('12 nodes → 12 unique skewed struts', () => {
    const struts = skewStruts(12);
    expect(struts).toHaveLength(12);
    const keys = struts.map(([a, b]) => `${Math.min(a, b)},${Math.max(a, b)}`);
    expect(new Set(keys).size).toBe(12);
    for (const [a, b] of struts) {
      expect(a).not.toBe(b);
      expect(Math.abs(a - b)).toBeGreaterThan(1);
    }
  });

  it('4 nodes → full skew pair set (no self-struts)', () => {
    const struts = skewStruts(4, 2);
    expect(struts).toHaveLength(2);
    expect(struts[0]).toEqual([0, 2]);
    expect(struts[1]).toEqual([1, 3]);
  });
});
