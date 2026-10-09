import { describe, expect, it } from 'vitest'
import { calmPhaseAt, CALM_SIGH_MS } from '../src/compositions/CalmOverlay'

describe('calmPhaseAt — the two-phase breathing timeline', () => {
  it('is in the acute sigh phase for the first 60s', () => {
    expect(calmPhaseAt(0)).toBe('sigh')
    expect(calmPhaseAt(30_000)).toBe('sigh')
    expect(calmPhaseAt(CALM_SIGH_MS - 1)).toBe('sigh')
  })

  it('settles into sustained coherence at/after 60s', () => {
    expect(calmPhaseAt(CALM_SIGH_MS)).toBe('coherence')
    expect(calmPhaseAt(CALM_SIGH_MS + 1)).toBe('coherence')
    expect(calmPhaseAt(600_000)).toBe('coherence')
  })

  it('respects a custom sigh window', () => {
    expect(calmPhaseAt(5_000, 10_000)).toBe('sigh')
    expect(calmPhaseAt(10_000, 10_000)).toBe('coherence')
  })

  it('is monotonic — once coherence, never back to sigh', () => {
    for (let t = 0; t < CALM_SIGH_MS + 60_000; t += 30_000) {
      if (t < CALM_SIGH_MS) expect(calmPhaseAt(t)).toBe('sigh')
      else expect(calmPhaseAt(t)).toBe('coherence')
    }
  })
})