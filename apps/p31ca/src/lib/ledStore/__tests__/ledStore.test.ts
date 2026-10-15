import { describe, it, expect, beforeEach } from 'vitest'
import { useLedStore, LED_MODES, applyPresetFromUrl, ledPresetToUrl, MODE_LABELS } from '../../../stores/ledStore'

describe('useLedStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useLedStore.setState({
      powered: true,
      mode: 'rainbow',
      speed: 45,
      brightness: 30,
      color: '#22d3ee',
      color2: '#a78bfa',
      blobBrightness: 60,
      blobSpeed: 50,
      blobColor: '#ff9944',
    })
  })

  it('exposes every LED mode with a label', () => {
    expect(LED_MODES).toHaveLength(8)
    for (const m of LED_MODES) expect(MODE_LABELS[m]).toBeTruthy()
  })

  it('toggles powered', () => {
    useLedStore.getState().togglePowered()
    expect(useLedStore.getState().powered).toBe(false)
  })

  it('sets mode + brightness + blob state', () => {
    useLedStore.getState().setMode('chase')
    useLedStore.getState().setBrightness(70)
    useLedStore.getState().setBlobColor('#22d3ee')
    const s = useLedStore.getState()
    expect(s.mode).toBe('chase')
    expect(s.brightness).toBe(70)
    expect(s.blobColor).toBe('#22d3ee')
  })

  it('persists to p31:led:v1', () => {
    useLedStore.getState().setMode('breath')
    const raw = localStorage.getItem('p31:led:v1')
    expect(raw).toBeTruthy()
    expect(raw).toContain('breath')
  })

  it('applyPresetFromUrl applies a mode', () => {
    const ok = applyPresetFromUrl('?m=dual-chase&s=80&b=50&power=0')
    expect(ok).toBe(true)
    const s = useLedStore.getState()
    expect(s.mode).toBe('dual-chase')
    expect(s.speed).toBe(80)
    expect(s.powered).toBe(false)
  })

  it('ledPresetToUrl round-trips', () => {
    useLedStore.getState().setMode('gradient')
    const url = ledPresetToUrl()
    expect(url).toContain('m=gradient')
  })
})