import { describe, it, expect } from 'vitest'
import { cssToHex, oklchToHex } from '../../color'

describe('cssToHex', () => {
  it('passes through a 6-digit hex', () => {
    expect(cssToHex('#22d3ee')).toBe('#22d3ee')
  })

  it('passes through a 3-digit hex', () => {
    expect(cssToHex('#f00')).toBe('#f00')
  })

  it('falls back on null/empty', () => {
    expect(cssToHex('')).toBe('#22d3ee')
    expect(cssToHex(null)).toBe('#22d3ee')
    expect(cssToHex('  ', '#ff9944')).toBe('#ff9944')
  })
})

describe('oklchToHex', () => {
  it('converts a known oklch to a hex string', () => {
    // oklch(0.72 0.18 210) ≈ a cyan
    const hex = oklchToHex('oklch(0.72 0.18 210)')
    expect(hex).toMatch(/^#[0-9a-f]{6}$/)
  })

  it('falls back on a non-oklch string', () => {
    expect(oklchToHex('not-a-color')).toBe('#22d3ee')
  })

  it('is deterministic', () => {
    expect(oklchToHex('oklch(0.78 0.14 200)')).toBe(oklchToHex('oklch(0.78 0.14 200)'))
  })
})