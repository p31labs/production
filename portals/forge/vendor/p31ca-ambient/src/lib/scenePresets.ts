/**
 * @file scenePresets.ts — named scene compositions.
 *
 * Four one-tap presets that shift the whole dome + starfield personality.
 * The catalog record (id, label, values) is the machine-readable source
 * the LedController's SCENE tab chips consume.
 */

import type { ScenePresetValue } from '../stores/sceneStore'

export interface ScenePreset {
  id: string
  label: string
  value: ScenePresetValue
}

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: 'cinematic',
    label: 'Cinematic',
    value: {
      dome: { rotation: 18, tilt: 0.14, scale: 1.8 },
      starfield: { density: 180, twinkle: 0.8, flare: 6 },
    },
  },
  {
    id: 'orbit',
    label: 'Orbit',
    value: {
      dome: { rotation: 55, tilt: 0.38, scale: 1.4 },
      starfield: { density: 140, twinkle: 1.2, flare: 4 },
    },
  },
  {
    id: 'static',
    label: 'Static',
    value: {
      dome: { rotation: 0, tilt: 0.21, scale: 1.6 },
      starfield: { density: 220, twinkle: 0.4, flare: 2 },
    },
  },
  {
    id: 'live',
    label: 'Live',
    value: {
      dome: { rotation: 35, tilt: 0.31, scale: 1.5 },
      starfield: { density: 300, twinkle: 1.8, flare: 12 },
    },
  },
]

export function presetById(id: string): ScenePreset | undefined {
  return SCENE_PRESETS.find((p) => p.id === id)
}