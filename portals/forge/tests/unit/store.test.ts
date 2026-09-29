import { describe, it, expect, beforeEach } from 'vitest'
import { useUI } from '../../src/lib/store'

describe('forge UI store', () => {
  beforeEach(() => {
    useUI.setState({
      world: 'ocean',
      mode: 'light',
      spoons: 5,
      paletteOpen: false,
      compileQueue: [],
    })
  })

  it('clamps spoons to 0..5', () => {
    useUI.getState().setSpoons(9)
    expect(useUI.getState().spoons).toBe(5)
    useUI.getState().setSpoons(-1)
    expect(useUI.getState().spoons).toBe(0)
    useUI.getState().setSpoons(2)
    expect(useUI.getState().spoons).toBe(2)
  })

  it('switches worlds and mode', () => {
    useUI.getState().setWorld('volt')
    expect(useUI.getState().world).toBe('volt')
    useUI.getState().setMode('dark')
    expect(useUI.getState().mode).toBe('dark')
  })

  it('dedupes the compile queue', () => {
    const s = useUI.getState()
    s.enqueueCompile('a')
    s.enqueueCompile('a')
    s.enqueueCompile('b')
    expect(useUI.getState().compileQueue).toEqual(['a', 'b'])
    useUI.getState().dequeueCompile('a')
    expect(useUI.getState().compileQueue).toEqual(['b'])
  })
})