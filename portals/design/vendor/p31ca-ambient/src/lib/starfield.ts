/**
 * @file starfield.ts — seeded 2D starfield (QPJ port).
 *
 * Deterministic star placement: x/y normalized 0..1, radius, twinkle phase,
 * twinkle speed. Ported from production/portals/qpj/src/lib/starfield.ts so
 * p31ca shares the exact star vocabulary the family companion uses.
 */

export interface Star {
  x: number
  y: number
  r: number
  tw: number
  ts: number
}

export function prng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

export function genStars(count: number, seed: number): Star[] {
  const rand = prng(seed)
  const stars: Star[] = []
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: rand(),
      y: rand(),
      r: 0.4 + rand() * 1.1,
      tw: rand() * Math.PI * 2,
      ts: 0.2 + rand() * 0.9,
    })
  }
  return stars
}