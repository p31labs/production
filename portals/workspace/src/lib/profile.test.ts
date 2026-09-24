import { describe, expect, it } from 'vitest'
import { nextPickleSeed, resolveProfile } from './profile'
import { pickleName } from './pickleNames'

describe('profile — resolveProfile merge', () => {
  it('resolves defaults when no overrides exist', () => {
    const p = resolveProfile('caregiver-one', '🧸')
    expect(p.id).toBe('caregiver-one')
    expect(p.emoji).toBe('🧸')
    expect(p.pickleName).toBe(pickleName('caregiver-one'))
    expect(p.greetingName).toBe(p.pickleName)
    expect(p.accent).toBe('cyan')
    expect(p.theme.world).toBe('aurora')
    expect(p.spoonsBaseline).toBe(4)
  })

  it('merges overrides over defaults', () => {
    const p = resolveProfile('young-one', '🌿', {
      emoji: '🫧',
      accent: 'gold',
      greetingName: 'Tiny Pickle',
      spoonsBaseline: 2,
      theme: { world: 'garden', age: 'child', muted: true, warmLight: true },
    })
    expect(p.emoji).toBe('🫧')
    expect(p.accent).toBe('gold')
    expect(p.greetingName).toBe('Tiny Pickle')
    expect(p.spoonsBaseline).toBe(2)
    expect(p.theme).toEqual({ world: 'garden', age: 'child', muted: true, warmLight: true })
  })

  it('uses the deterministic pickle name when re-pickled', () => {
    const seed = nextPickleSeed('caregiver-two', 3)
    const p = resolveProfile('caregiver-two', '🛰️', { pickleSeed: seed })
    expect(p.pickleName).toBe(pickleName(seed))
    expect(p.greetingName).toBe(p.pickleName)
  })

  it('falls back to pickle name for a blank greeting', () => {
    const p = resolveProfile('caregiver-one', '🧸', { greetingName: '   ' })
    expect(p.greetingName).toBe(p.pickleName)
  })
})

describe('profile — re-pickle seed determinism', () => {
  it('is stable across calls', () => {
    expect(nextPickleSeed('young-one', 2)).toBe(nextPickleSeed('young-one', 2))
  })

  it('changes across versions and members', () => {
    expect(nextPickleSeed('young-one', 1)).not.toBe(nextPickleSeed('young-one', 2))
    expect(nextPickleSeed('caregiver-one', 1)).not.toBe(nextPickleSeed('young-one', 1))
  })
})