// useSensoryStore.ts — neurodivergent-friendly & mathematically precise preferences.
// Sensory color modes (muted/warmLight) are applied by useThemeStore at applyTheme()
// using pure OKLCH math; every other flag drives CSS via data-* attributes on <html>
// (synced in App.tsx) and is read directly by components.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type FontMode = 'standard' | 'hyperlegible';
export type TextScale = 'standard' | 'comfort';

const motionPref =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

interface SensoryState {
  muted: boolean;
  warmLight: boolean;
  font: FontMode;
  textScale: TextScale;
  calm: boolean;
  focus: boolean;
  simple: boolean;
  task: boolean;
  setMuted: (v: boolean) => void;
  setWarmLight: (v: boolean) => void;
  setFont: (v: FontMode) => void;
  setTextScale: (v: TextScale) => void;
  setCalm: (v: boolean) => void;
  setFocus: (v: boolean) => void;
  setSimple: (v: boolean) => void;
  setTask: (v: boolean) => void;
  toggleMuted: () => void;
  toggleWarmLight: () => void;
  toggleCalm: () => void;
  toggleFocus: () => void;
  toggleSimple: () => void;
  toggleTask: () => void;
}

export const useSensoryStore = create<SensoryState>()(
  persist(
    (set, get) => ({
      muted: false,
      warmLight: false,
      font: 'standard',
      textScale: 'standard',
      calm: motionPref,
      focus: false,
      simple: false,
      task: false,

      setMuted: (v) => set({ muted: v }),
      setWarmLight: (v) => set({ warmLight: v }),
      setFont: (v) => set({ font: v }),
      setTextScale: (v) => set({ textScale: v }),
      setCalm: (v) => set({ calm: v }),
      setFocus: (v) => set({ focus: v }),
      setSimple: (v) => set({ simple: v }),
      setTask: (v) => set({ task: v }),
      toggleMuted: () => set({ muted: !get().muted }),
      toggleWarmLight: () => set({ warmLight: !get().warmLight }),
      toggleCalm: () => set({ calm: !get().calm }),
      toggleFocus: () => set({ focus: !get().focus }),
      toggleSimple: () => set({ simple: !get().simple }),
      toggleTask: () => set({ task: !get().task }),
    }),
    { name: 'p31-sensory' }
  )
);
