import { create } from 'zustand'

/**
 * useEffectsStore — the spoon/pulse/audio state the dome and the scene
 * command read from.
 *
 * Mirrors the previous deploy's effects store (`B`): spoon level, calm /
 * reduced-motion floors, urgent flag, pulse events (timed, weighted), audio
 * energy, and auto-mode. The molecular-heart dome subscribes to pulse events
 * so a change (spoons, LED mode, brightness) triggers a small heart surge.
 */
interface EffectsState {
  spoons: number
  calm: boolean
  reduceMotion: boolean
  urgent: boolean
  pulseAt: number | null
  pulseWeight: number
  audioEnergy: number
  isAutoMode: boolean

  setSpoons: (n: number) => void
  setCalm: (c: boolean) => void
  setUrgent: (u: boolean) => void
  pulse: (weight?: number) => void
  setAudioEnergy: (e: number) => void
  setAutoMode: (a: boolean) => void
}

export const useEffectsStore = create<EffectsState>((set, get) => ({
  spoons: 3,
  calm: false,
  reduceMotion: false,
  urgent: false,
  pulseAt: null,
  pulseWeight: 0,
  audioEnergy: 0,
  isAutoMode: false,

  setSpoons: (spoons) => set({ spoons: Math.max(0, Math.min(5, Math.round(spoons))) }),
  setCalm: (calm) => set({ calm }),
  setUrgent: (urgent) => set({ urgent }),
  pulse: (weight = 0.35) => set({ pulseAt: Date.now(), pulseWeight: weight }),
  setAudioEnergy: (audioEnergy) => set({ audioEnergy: Math.max(0, Math.min(1, audioEnergy)) }),
  setAutoMode: (isAutoMode) => set({ isAutoMode }),
}))

/** Initialise reduce-motion + spoon from the DOM once (client only). */
export function initEffectsFromDom(): void {
  if (typeof window === 'undefined') return
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const stored = Number.parseInt(localStorage.getItem('p31:spoons') ?? '', 10)
  const spoons = Number.isFinite(stored) ? stored : 3
  useEffectsStore.setState({ reduceMotion: reduced, spoons })
  document.documentElement.setAttribute('data-spoons', String(spoons))
}