import { describe, it, expect, beforeEach } from 'vitest'
import { useLedStore, LED_PRESETS, applyNamedPreset } from '../../../stores/ledStore'

beforeEach(() => {
  localStorage.clear()
  useLedStore.setState({ powered: true, mode: 'rainbow', speed: 45, brightness: 30 })
})

describe('LED presets', () => {
  it('ships 5 presets with ids', () => {
    expect(LED_PRESETS).toHaveLength(5)
    for (const p of LED_PRESETS) expect(p.id).toBeTruthy()
  })

  it('applyNamedPreset applies a preset patch', () => {
    const ok = applyNamedPreset('night')
    expect(ok).toBe(true)
    expect(useLedStore.getState().mode).toBe('solid')
    expect(useLedStore.getState().brightness).toBe(15)
  })

  it('applyNamedPreset returns false for unknown id', () => {
    expect(applyNamedPreset('nope')).toBe(false)
  })
})