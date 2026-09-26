import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LedMode = 'chase' | 'rainbow' | 'breath' | 'solid' | 'gradient' | 'dual-chase' | 'off'

export const LED_MODES: LedMode[] = ['chase', 'rainbow', 'breath', 'solid', 'gradient', 'dual-chase', 'off']

export const MODE_LABELS: Record<LedMode, string> = {
  chase: 'CHASE',
  rainbow: 'RAINBOW',
  breath: 'BREATH',
  solid: 'SOLID',
  gradient: 'GRADIENT',
  'dual-chase': 'DUAL',
  off: 'OFF',
}

export const MODE_HINTS: Record<LedMode, string> = {
  chase: 'Trail chases around the ring',
  rainbow: 'Spectrum wave washes the ring',
  breath: 'Ring pulses with your heartbeat',
  solid: 'Solid color',
  gradient: 'Color 1 → Color 2 sweep',
  'dual-chase': 'Two colors chase each other',
  off: 'Ring dark, heart glows',
}

/** Modes that use a second color (color2). */
export const MODE_USES_PALETTE: Record<LedMode, number> = {
  chase: 0,
  rainbow: 0,
  breath: 0,
  solid: 0,
  gradient: 2,
  'dual-chase': 2,
  off: 0,
}

interface LedState {
  powered: boolean
  mode: LedMode
  speed: number
  brightness: number
  color: string
  color2: string
  blobBrightness: number
  blobSpeed: number
  blobColor: string

  togglePowered: () => void
  setMode: (m: LedMode) => void
  setSpeed: (n: number) => void
  setBrightness: (n: number) => void
  setColor: (c: string) => void
  setColor2: (c: string) => void
  setBlobBrightness: (n: number) => void
  setBlobSpeed: (n: number) => void
  setBlobColor: (c: string) => void
  applyPreset: (p: Partial<Pick<LedState, 'powered' | 'mode' | 'speed' | 'brightness' | 'color' | 'color2' | 'blobBrightness' | 'blobSpeed' | 'blobColor'>>) => void
  reset: () => void
}

const DEFAULTS = {
  powered: true,
  mode: 'breath' as LedMode,
  speed: 30,
  brightness: 15,
  color: '#22d3ee',
  color2: '#a78bfa',
  blobBrightness: 45,
  blobSpeed: 50,
  blobColor: '#ff9944',
}

/**
 * useLedStore — the dome's LED controller state.
 *
 * Persisted to `p31:led:v1`. Drives the molecular-heart dome's LED ring and
 * the heart's blob brightness/speed/color. The scene command (LUMI) maps
 * natural-language requests to these setters.
 */
export const useLedStore = create<LedState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,

      togglePowered: () => set({ powered: !get().powered }),
      setMode: (mode) => set({ mode }),
      setSpeed: (speed) => set({ speed }),
      setBrightness: (brightness) => set({ brightness }),
      setColor: (color) => set({ color }),
      setColor2: (color2) => set({ color2 }),
      setBlobBrightness: (blobBrightness) => set({ blobBrightness }),
      setBlobSpeed: (blobSpeed) => set({ blobSpeed }),
      setBlobColor: (blobColor) => set({ blobColor }),
      applyPreset: (p) => set(p),
      reset: () => set({ ...DEFAULTS }),
    }),
    { name: 'p31:led:v2' },
  ),
)

/** Serialize the current LED state into a shareable query string. */
export function ledPresetToUrl(): string {
  const s = useLedStore.getState()
  const params = new URLSearchParams({
    m: s.mode,
    s: String(s.speed),
    b: String(s.brightness),
    c: s.color,
    c2: s.color2,
    bb: String(s.blobBrightness),
    bs: String(s.blobSpeed),
    bc: s.blobColor,
    power: s.powered ? '1' : '0',
  })
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`
}

/** Apply a preset query string (from ledPresetToUrl) to the store. */
export function applyPresetFromUrl(query: string): boolean {
  try {
    const params = new URLSearchParams(query)
    const patch: Partial<LedState> = {}
    const mode = params.get('m')
    if (mode && (LED_MODES as string[]).includes(mode)) patch.mode = mode as LedMode
    const speed = params.get('s')
    if (speed) patch.speed = Number(speed)
    const brightness = params.get('b')
    if (brightness) patch.brightness = Number(brightness)
    const color = params.get('c')
    if (color) patch.color = color
    const color2 = params.get('c2')
    if (color2) patch.color2 = color2
    const bb = params.get('bb')
    if (bb) patch.blobBrightness = Number(bb)
    const bs = params.get('bs')
    if (bs) patch.blobSpeed = Number(bs)
    const bc = params.get('bc')
    if (bc) patch.blobColor = bc
    const power = params.get('power')
    if (power) patch.powered = power === '1'
    if (Object.keys(patch).length > 0) useLedStore.getState().applyPreset(patch)
    return Object.keys(patch).length > 0
  } catch {
    return false
  }
}

/** Named LED presets — full state bundles (tier-3 one-tap actions). */
export interface LedPreset {
  id: string
  label: string
  patch: Partial<Pick<
    LedState,
    'powered' | 'mode' | 'speed' | 'brightness' | 'color' | 'color2' | 'blobBrightness' | 'blobSpeed' | 'blobColor'
  >>
}

export const LED_PRESETS: LedPreset[] = [
  {
    id: 'warm',
    label: 'Warm',
    patch: { powered: true, mode: 'gradient', color: '#ffb066', color2: '#ff7a4d', brightness: 55, speed: 35, blobColor: '#ffb066' },
  },
  {
    id: 'cool',
    label: 'Cool',
    patch: { powered: true, mode: 'gradient', color: '#66c7ff', color2: '#7a8fff', brightness: 50, speed: 45, blobColor: '#66c7ff' },
  },
  {
    id: 'rainbow',
    label: 'Rainbow',
    patch: { powered: true, mode: 'rainbow', brightness: 60, speed: 55, blobColor: '#22d3ee' },
  },
  {
    id: 'calm',
    label: 'Calm',
    patch: { powered: true, mode: 'breath', color: '#7a8fff', brightness: 30, speed: 20, blobBrightness: 40, blobSpeed: 25, blobColor: '#7a8fff' },
  },
  {
    id: 'night',
    label: 'Night',
    patch: { powered: true, mode: 'solid', color: '#3a3a52', brightness: 15, speed: 0, blobBrightness: 25, blobSpeed: 15, blobColor: '#5a5a80' },
  },
]

export function applyNamedPreset(id: string): boolean {
  const preset = LED_PRESETS.find((p) => p.id === id)
  if (!preset) return false
  useLedStore.getState().applyPreset(preset.patch)
  return true
}