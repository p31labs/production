import { describe, it, expect } from 'vitest'
import { COMMAND_INDEX, searchCommands, groupByKind, KIND_LABELS } from '../../commandSearch'

describe('commandSearch — index', () => {
  it('indexes every atom, lab item, and portal', () => {
    expect(COMMAND_INDEX.length).toBeGreaterThanOrEqual(20)
    const kinds = new Set(COMMAND_INDEX.map((c) => c.kind))
    expect(kinds).toEqual(new Set(['atom', 'lab', 'portal']))
  })

  it('every entry has a label, hint, and kind', () => {
    for (const c of COMMAND_INDEX) {
      expect(c.label).toBeTruthy()
      expect(c.hint).toBeTruthy()
      expect(KIND_LABELS[c.kind]).toBeTruthy()
    }
  })
})

describe('commandSearch — search ranking', () => {
  it('returns the full index for an empty query', () => {
    expect(searchCommands('')).toHaveLength(COMMAND_INDEX.length)
  })

  it('ranks an exact label match first', () => {
    const r = searchCommands('home')
    expect(r[0]?.label.toLowerCase()).toBe('home')
  })

  it('matches case-insensitively', () => {
    expect(searchCommands('HOME')[0]?.label.toLowerCase()).toBe('home')
    expect(searchCommands('Home')[0]?.label.toLowerCase()).toBe('home')
  })

  it('matches on prefix', () => {
    const r = searchCommands('res')
    expect(r.some((c) => c.label === 'Research')).toBe(true)
  })

  it('matches on keyword', () => {
    const r = searchCommands('portal')
    expect(r.length).toBeGreaterThan(0)
  })

  it('returns nothing for a nonsense query', () => {
    expect(searchCommands('xyzzy-nonexistent')).toHaveLength(0)
  })
})

describe('commandSearch — grouping', () => {
  it('groups by kind', () => {
    const g = groupByKind(COMMAND_INDEX)
    expect(g.atom.length).toBeGreaterThan(0)
    expect(g.lab.length).toBeGreaterThan(0)
    expect(g.portal.length).toBeGreaterThan(0)
  })
})