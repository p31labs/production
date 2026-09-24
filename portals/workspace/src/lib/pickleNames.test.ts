import { describe, it, expect } from 'vitest'
import { pickleName, roster } from './pickleNames'

describe('pickleNames — deterministic codename system', () => {
  it('yields a stable codename for the same seed', () => {
    expect(pickleName('caregiver-one')).toBe(pickleName('caregiver-one'))
    expect(pickleName('young-one')).toBe(pickleName('young-one'))
  })

  it('yields distinct codenames for different seeds', () => {
    expect(pickleName('caregiver-one')).not.toBe(pickleName('caregiver-two'))
    expect(pickleName('caregiver-one')).not.toBe(pickleName('young-one'))
  })

  it('never exposes a human name or raw id — pickle labels only', () => {
    for (const m of roster()) {
      // The label is a two-word pickle name, not the slot id.
      expect(m.pickleName).not.toBe(m.id)
      expect(m.pickleName.split(' ')).toHaveLength(2)
      // The monogram is the first character of the label.
      expect(m.monogram).toBe(m.pickleName.charAt(0))
      // No known human names leak.
      expect(m.pickleName).not.toMatch(/Alex|Sam|Maya|Willow/i)
    }
  })

  it('produces exactly one codename per roster member', () => {
    expect(roaster()).toBe(3)
  })
})

function roaster(): number {
  return roster().length
}