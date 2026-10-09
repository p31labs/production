import { describe, it, expect } from 'vitest'
import { DESTINATIONS, destinationFor } from '../../portalRouter'

describe('portalRouter', () => {
  it('exposes every destination', () => {
    expect(DESTINATIONS).toHaveLength(6)
    expect(DESTINATIONS.map((d) => d.id)).toEqual([
      'workspace', 'qpj', 'arcade', 'chat', 'tetra', 'passports',
    ])
  })

  it('returns a destination by id', () => {
    expect(destinationFor('qpj').url).toContain('qpj.p31ca.org')
    expect(destinationFor('arcade').url).toContain('willow.p31ca.org')
    expect(destinationFor('passports').url).toContain('#/identity')
  })

  it('throws for an unknown id', () => {
    // @ts-expect-error intentional bad input
    expect(() => destinationFor('nope')).toThrow(/No destination/)
  })

  it('marks each destination with access + external flags', () => {
    for (const d of DESTINATIONS) {
      expect(['open', 'caregiver']).toContain(d.access)
      expect(typeof d.external).toBe('boolean')
      expect(typeof d.live).toBe('boolean')
    }
  })
})