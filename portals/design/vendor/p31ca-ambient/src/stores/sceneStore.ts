import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * @file sceneStore.ts — dome + starfield composition controls.
 *
 * Persisted to `p31:scene:v1`. Initial values come from the CSS scene
 * tokens (--p31-scene-*) so a theme or designer can set the opening scene;
 * the runtime then owns the values after any user adjustment. The
 * MolecularHeart and Starfield components subscribe to keep in sync.
 */

export interface ScenePresetValue {
  dome: { rotation: number; tilt: number; scale: number }
  starfield: { density: number; twinkle: number; flare: number }
}

interface SceneState extends ScenePresetValue {
  setRotation: (v: number) => void
  setTilt: (v: number) => void
  setScale: (v: number) => void
  setDensity: (v: number) => void
  setTwinkle: (v: number) => void
  setFlare: (v: number) => void
  applyPreset: (preset: ScenePresetValue) => void
  reset: () => void
}

export const SCENE_DEFAULTS: ScenePresetValue = {
  dome: { rotation: 1, tilt: 0.18, scale: 2.2 },
  starfield: { density: 140, twinkle: 1, flare: 6 },
}

/** Read a CSS scene token (falling back to a default). */
function readToken(name: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : fallback
}

/** Read the full scene config from the CSS tokens (theme-aware opening state). */
export function readSceneFromCss(): ScenePresetValue {
  return {
    dome: {
      rotation: readToken('--p31-scene-rotation', SCENE_DEFAULTS.dome.rotation),
      tilt: readToken('--p31-scene-tilt', SCENE_DEFAULTS.dome.tilt),
      scale: readToken('--p31-scene-scale', SCENE_DEFAULTS.dome.scale),
    },
    starfield: {
      density: readToken('--p31-scene-star-density', SCENE_DEFAULTS.starfield.density),
      twinkle: readToken('--p31-scene-star-twinkle', SCENE_DEFAULTS.starfield.twinkle),
      flare: readToken('--p31-scene-star-flare', SCENE_DEFAULTS.starfield.flare),
    },
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function clampPreset(p: ScenePresetValue): ScenePresetValue {
  return {
    dome: {
      rotation: clamp(p.dome.rotation, 0, 100),
      tilt: clamp(p.dome.tilt, 0, 0.6),
      scale: clamp(p.dome.scale, 1.0, 2.5),
    },
    starfield: {
      density: Math.round(clamp(p.starfield.density, 60, 500)),
      twinkle: clamp(p.starfield.twinkle, 0, 3),
      flare: Math.round(clamp(p.starfield.flare, 0, 12)),
    },
  }
}

export const useSceneStore = create<SceneState>()(
  persist(
    (set, get) => ({
      ...SCENE_DEFAULTS,

      setRotation: (v) => set({ dome: { ...get().dome, rotation: clamp(v, 0, 100) } }),
      setTilt: (v) => set({ dome: { ...get().dome, tilt: clamp(v, 0, 0.6) } }),
      setScale: (v) => set({ dome: { ...get().dome, scale: clamp(v, 1.0, 2.5) } }),
      setDensity: (v) => set({ starfield: { ...get().starfield, density: Math.round(clamp(v, 60, 500)) } }),
      setTwinkle: (v) => set({ starfield: { ...get().starfield, twinkle: clamp(v, 0, 3) } }),
      setFlare: (v) => set({ starfield: { ...get().starfield, flare: Math.round(clamp(v, 0, 12)) } }),
      applyPreset: (preset) => set(clampPreset(preset)),
      reset: () => set(readSceneFromCss()),
    }),
    {
      name: 'p31:scene:v2',
      onRehydrateStorage: () => (state) => {
        // First run (nothing persisted): hydrate from the CSS tokens so a
        // theme's opening scene applies before any user adjustment.
        if (state) {
          try {
            const persisted = localStorage.getItem('p31:scene:v2')
            if (!persisted) Object.assign(state, readSceneFromCss())
          } catch {
            /* storage unavailable — keep defaults */
          }
        }
      },
    },
  ),
)