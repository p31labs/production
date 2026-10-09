import { describe, it, expect } from 'vitest'
import { icosahedronGeodesic } from '../../geodesic'

describe('icosahedronGeodesic — vertex/edge/face counts', () => {
  it('detail 0 → 12 verts, 30 edges, 20 faces', () => {
    const g = icosahedronGeodesic(1, 0)
    expect(g.vertices).toHaveLength(12)
    expect(g.edges).toHaveLength(30)
    expect(g.faces).toHaveLength(20)
  })

  it('detail 1 → 42 verts, 120 edges, 80 faces', () => {
    const g = icosahedronGeodesic(1, 1)
    expect(g.vertices).toHaveLength(42)
    expect(g.edges).toHaveLength(120)
    expect(g.faces).toHaveLength(80)
  })

  it('detail 2 → 162 verts, 480 edges, 320 faces', () => {
    const g = icosahedronGeodesic(1, 2)
    expect(g.vertices).toHaveLength(162)
    expect(g.edges).toHaveLength(480)
    expect(g.faces).toHaveLength(320)
  })
})

describe('icosahedronGeodesic — normalization', () => {
  it('every vertex sits on the sphere of the given radius', () => {
    const R = 3.2
    const g = icosahedronGeodesic(R, 1)
    for (const [x, y, z] of g.vertices) {
      const r = Math.sqrt(x * x + y * y + z * z)
      expect(Math.abs(r - R)).toBeLessThan(1e-6)
    }
  })

  it('different radius → scaled vertices (radius doubles)', () => {
    const a = icosahedronGeodesic(1, 1)
    const b = icosahedronGeodesic(2, 1)
    const ra = Math.hypot(a.vertices[0][0], a.vertices[0][1], a.vertices[0][2])
    const rb = Math.hypot(b.vertices[0][0], b.vertices[0][1], b.vertices[0][2])
    expect(rb / ra).toBeCloseTo(2, 5)
  })
})

describe('icosahedronGeodesic — determinism', () => {
  it('same inputs → identical output', () => {
    const a = icosahedronGeodesic(3.2, 2)
    const b = icosahedronGeodesic(3.2, 2)
    expect(a.vertices).toEqual(b.vertices)
    expect(a.edges).toEqual(b.edges)
    expect(a.faces).toEqual(b.faces)
  })
})