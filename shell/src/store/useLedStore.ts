// useLedStore.ts — NeoPixel LED state (features/ship + Hardware HUD).
// Shared between the right-rail NeoPixel controller and the dome's instanced
// NeoPixel ring. Persisted so LED choices survive reload. Simulation-only:
// physical hardware dispatch lives in @p31ca/spaceship-earth (Node Zero bridge).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LedMode = 'rainbow' | 'chase' | 'solid' | 'breath' | 'gradient' | 'dual-chase' | 'off';

export const LED_MODES: LedMode[] = ['rainbow', 'chase', 'solid', 'breath', 'gradient', 'dual-chase', 'off'];

export const LED_PALETTE_SLOTS: Record<LedMode, number> = {
  rainbow: 0,
  chase: 0,
  solid: 0,
  breath: 0,
  gradient: 2,
  'dual-chase': 2,
  off: 0,
};

export const LED_MODE_INFO: Record<LedMode, string> = {
  rainbow: 'Full-spectrum wave',
  chase: 'Uses primary color (trail)',
  solid: 'Uses primary color',
  breath: 'Uses primary color',
  gradient: 'Uses Color 1 to Color 2',
  'dual-chase': 'Uses Color 1 + Color 2',
  off: 'Frame off',
};

interface LedState {
  mode: LedMode;
  speed: number;
  brightness: number;
  color: string;
  colors: string[];
  setMode: (mode: LedMode) => void;
  setSpeed: (speed: number) => void;
  setBrightness: (brightness: number) => void;
  setColor: (color: string) => void;
  setColors: (colors: string[]) => void;
  resetLed: () => void;
}

const DEFAULTS = {
  mode: 'rainbow' as LedMode,
  speed: 5,
  brightness: 80,
  color: '#22d3ee',
  colors: ['#ff9944', '#22d3ee', '#44ffaa'],
};

export const useLedStore = create<LedState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      setMode: (mode) => set({ mode }),
      setSpeed: (speed) => set({ speed: Math.min(10, Math.max(0, speed)) }),
      setBrightness: (brightness) => set({ brightness: Math.min(100, Math.max(0, brightness)) }),
      setColor: (color) => set({ color }),
      setColors: (colors) => set({ colors }),
      resetLed: () => set({ ...DEFAULTS }),
    }),
    { name: 'p31-led-v1', version: 1 }
  )
);
