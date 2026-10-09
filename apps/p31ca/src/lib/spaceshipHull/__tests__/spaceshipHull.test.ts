import { describe, it, expect } from 'vitest'

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('hull lattice — deterministic', () => {
  it('same seed → same first 5 values', () => {
    const a = mulberry32(0xc0ffee)
    const b = mulberry32(0xc0ffee)
    expect([a(), a(), a(), a(), a()]).toEqual([b(), b(), b(), b(), b()])
  })

  it('different seed → different sequence', () => {
    const a = mulberry32(0xc0ffee)
    const b = mulberry32(0xbeef)
    expect(a()).not.toBe(b())
  })

  it('produces values in [0, 1)', () => {
    const r = mulberry32(42)
    for (let i = 0; i < 20; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})