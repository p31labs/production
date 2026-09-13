// useEffectsStore.ts — Effects & Cosmos preferences (features/ship + passport).
// Keeps the starfield and dome's decorative motion/color under explicit user control,
// independent of sensory modes (calm still wins globally via CSS --p31-speed-factor).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type EffectLevel = 'low' | 'medium' | 'high';

interface EffectsState {
  starDensity: EffectLevel;
  starSpeed: EffectLevel;
  warmStars: boolean;
  domeAccent: boolean;
  cometTrails: boolean;
  aurora: boolean;
  quantum: boolean;
  larmorActive: boolean;
  setStarDensity: (v: EffectLevel) => void;
  setStarSpeed: (v: EffectLevel) => void;
  setWarmStars: (v: boolean) => void;
  setDomeAccent: (v: boolean) => void;
  setCometTrails: (v: boolean) => void;
  setAurora: (v: boolean) => void;
  setQuantum: (v: boolean) => void;
  toggleLarmor: () => void;
  resetEffects: () => void;
}

export const useEffectsStore = create<EffectsState>()(
  persist(
    (set) => ({
      starDensity: 'medium',
      starSpeed: 'medium',
      warmStars: false,
      domeAccent: false,
      cometTrails: false,
      aurora: false,
      quantum: false,
      larmorActive: false,
      setStarDensity: (v) => set({ starDensity: v }),
      setStarSpeed: (v) => set({ starSpeed: v }),
      setWarmStars: (v) => set({ warmStars: v }),
      setDomeAccent: (v) => set({ domeAccent: v }),
      setCometTrails: (v) => set({ cometTrails: v }),
      setAurora: (v) => set({ aurora: v }),
      setQuantum: (v) => set({ quantum: v }),
      toggleLarmor: () => set((state) => ({ larmorActive: !state.larmorActive })),
      resetEffects: () => set({ starDensity: 'medium', starSpeed: 'medium', warmStars: false, domeAccent: false, cometTrails: false, aurora: false, quantum: false, larmorActive: false }),
    }),
    { name: 'p31-effects-v1', version: 1 }
  )
);
