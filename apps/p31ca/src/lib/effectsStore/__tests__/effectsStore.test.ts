import { describe, it, expect, beforeEach } from 'vitest'
import { useEffectsStore, initEffectsFromDom } from '../../../stores/effectsStore'

describe('useEffectsStore', () => {
  beforeEach(() => {
    useEffectsStore.setState({ spoons: 3, calm: false, reduceMotion: false, urgent: false, pulseAt: null, pulseWeight: 0, audioEnergy: 0, isAutoMode: false })
  })

  it('clamps spoons to 0–5', () => {
    useEffectsStore.getState().setSpoons(9)
    expect(useEffectsStore.getState().spoons).toBe(5)
    useEffectsStore.getState().setSpoons(-3)
    expect(useEffectsStore.getState().spoons).toBe(0)
  })

  it('records a pulse with weight', () => {
    const before = useEffectsStore.getState().pulseAt
    useEffectsStore.getState().pulse(0.5)
    expect(useEffectsStore.getState().pulseAt).not.toBeNull()
    expect(useEffectsStore.getState().pulseWeight).toBe(0.5)
    expect(before).not.toBe(useEffectsStore.getState().pulseAt)
  })

  it('clamps audio energy to 0–1', () => {
    useEffectsStore.getState().setAudioEnergy(2)
    expect(useEffectsStore.getState().audioEnergy).toBe(1)
    useEffectsStore.getState().setAudioEnergy(-1)
    expect(useEffectsStore.getState().audioEnergy).toBe(0)
  })

  it('toggles auto mode + calm + urgent', () => {
    useEffectsStore.getState().setAutoMode(true)
    useEffectsStore.getState().setCalm(true)
    useEffectsStore.getState().setUrgent(true)
    const s = useEffectsStore.getState()
    expect(s.isAutoMode).toBe(true)
    expect(s.calm).toBe(true)
    expect(s.urgent).toBe(true)
  })
})