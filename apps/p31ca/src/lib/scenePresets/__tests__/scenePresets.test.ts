import { describe, it, expect } from 'vitest'
import { SCENE_PRESETS, presetById } from '../../scenePresets'

describe('scenePresets — catalog', () => {
  it('ships 4 presets with ids and labels', () => {
    expect(SCENE_PRESETS).toHaveLength(4)
    for (const p of SCENE_PRESETS) {
      expect(p.id).toBeTruthy()
      expect(p.label).toBeTruthy()
    }
  })

  it('every preset defines all 6 controls', () => {
    for (const p of SCENE_PRESETS) {
      expect(typeof p.value.dome.rotation).toBe('number')
      expect(typeof p.value.dome.tilt).toBe('number')
      expect(typeof p.value.dome.scale).toBe('number')
      expect(typeof p.value.starfield.density).toBe('number')
      expect(typeof p.value.starfield.twinkle).toBe('number')
      expect(typeof p.value.starfield.flare).toBe('number')
    }
  })

  it('every value is within its documented range', () => {
    for (const p of SCENE_PRESETS) {
      const { dome, starfield } = p.value
      expect(dome.rotation).toBeGreaterThanOrEqual(0)
      expect(dome.rotation).toBeLessThanOrEqual(100)
      expect(dome.tilt).toBeGreaterThanOrEqual(0)
      expect(dome.tilt).toBeLessThanOrEqual(0.6)
      expect(dome.scale).toBeGreaterThanOrEqual(1.0)
      expect(dome.scale).toBeLessThanOrEqual(2.5)
      expect(starfield.density).toBeGreaterThanOrEqual(60)
      expect(starfield.density).toBeLessThanOrEqual(500)
      expect(starfield.twinkle).toBeGreaterThanOrEqual(0)
      expect(starfield.twinkle).toBeLessThanOrEqual(3)
      expect(starfield.flare).toBeGreaterThanOrEqual(0)
      expect(starfield.flare).toBeLessThanOrEqual(12)
    }
  })

  it('the Static preset is fully stationary', () => {
    const staticPreset = presetById('static')!
    expect(staticPreset.value.dome.rotation).toBe(0)
  })

  it('the Live preset has the highest flare', () => {
    const live = presetById('live')!
    const others = SCENE_PRESETS.filter((p) => p.id !== 'live')
    for (const o of others) {
      expect(live.value.starfield.flare).toBeGreaterThanOrEqual(o.value.starfield.flare)
    }
  })
})