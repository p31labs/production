import { describe, expect, it } from 'vitest'
import { genStars, prng } from './Starfield'
import { useNotifStore } from '../store/useNotifStore'

describe('starfield generation', () => {
  it('is deterministic for a given seed', () => {
    const a = genStars(140, 182332)
    const b = genStars(140, 182332)
    expect(a).toEqual(b)
  })

  it('produces a different pattern for a different seed', () => {
    const a = genStars(140, 182332)
    const b = genStars(140, 999999)
    expect(a).not.toEqual(b)
  })

  it('emits normalized coordinates and plausible radii/timing', () => {
    const stars = genStars(140, 182332)
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0)
      expect(s.x).toBeLessThan(1)
      expect(s.y).toBeGreaterThanOrEqual(0)
      expect(s.y).toBeLessThan(1)
      expect(s.r).toBeGreaterThanOrEqual(0.4)
      expect(s.r).toBeLessThan(1.6)
      expect(s.ts).toBeGreaterThanOrEqual(0.2)
      expect(s.ts).toBeLessThan(1.1)
    }
  })

  it('prng sequence is reproducible', () => {
    const r1 = prng(7)
    const r2 = prng(7)
    const seq = [r1(), r1(), r1()]
    expect([r2(), r2(), r2()]).toEqual(seq)
  })
})

describe('notification store', () => {
  it('pushes and keeps at most MAX_KEPT (8) items', () => {
    const s = useNotifStore.getState()
    for (let i = 0; i < 12; i += 1) {
      s.notify({ kind: 'info', title: `n${i}` })
    }
    expect(useNotifStore.getState().items.length).toBe(8)
    expect(useNotifStore.getState().items[7]!.title).toBe('n11')
  })

  it('marks burst notifications', () => {
    useNotifStore.getState().clearAll()
    useNotifStore.getState().notify({ kind: 'milestone', title: 'burst', burst: true })
    const last = useNotifStore.getState().items.at(-1)!
    expect(last.burst).toBe(true)
    expect(last.title).toBe('burst')
  })

  it('dismisses by id and clears all', () => {
    useNotifStore.getState().clearAll()
    useNotifStore.getState().notify({ kind: 'success', title: 'a' })
    useNotifStore.getState().notify({ kind: 'error', title: 'b' })
    const [first, second] = useNotifStore.getState().items
    useNotifStore.getState().dismiss(first!.id)
    expect(useNotifStore.getState().items.map((n) => n.title)).toEqual(['b'])
    expect(useNotifStore.getState().items[0]!.id).toBe(second!.id)
    useNotifStore.getState().clearAll()
    expect(useNotifStore.getState().items).toEqual([])
  })
})