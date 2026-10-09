import { describe, it, expect } from 'vitest'
import { pickleName, ROSTER } from '../../pickleName'

describe('pickleName — deterministic codenames', () => {
  it('is stable across calls', () => {
    expect(pickleName('caregiver-one')).toBe(pickleName('caregiver-one'))
  })

  it('differs per slot', () => {
    expect(pickleName('caregiver-one')).not.toBe(pickleName('caregiver-two'))
  })

  it('produces two-word labels', () => {
    for (const m of ROSTER) {
      expect(pickleName(m.id).split(' ')).toHaveLength(2)
    }
  })

  it('the founder (caregiver-one) resolves to the codename on the public Team page', () => {
    // The badge on /team must match what pickleName('caregiver-one') actually
    // produces — the seed is the slot id, never a human name string.
    expect(pickleName('caregiver-one')).toBe('Seed Mist')
  })
})