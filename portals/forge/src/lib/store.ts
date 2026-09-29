import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const WORLDS = ['ocean', 'garden', 'aurora', 'zen', 'volt'] as const
export type World = (typeof WORLDS)[number]

interface UIState {
  world: World
  mode: 'light' | 'dark'
  spoons: number
  paletteOpen: boolean
  compileQueue: string[]
  setWorld: (w: World) => void
  setMode: (m: 'light' | 'dark') => void
  setSpoons: (n: number) => void
  togglePalette: () => void
  enqueueCompile: (id: string) => void
  dequeueCompile: (id: string) => void
}

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      world: 'ocean',
      mode: 'light',
      spoons: 5,
      paletteOpen: false,
      compileQueue: [],
      setWorld: (world) => set({ world }),
      setMode: (mode) => set({ mode }),
      setSpoons: (n) => set({ spoons: Math.max(0, Math.min(5, n)) }),
      togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
      enqueueCompile: (id) => set((s) => ({ compileQueue: [...new Set([...s.compileQueue, id])] })),
      dequeueCompile: (id) => set((s) => ({ compileQueue: s.compileQueue.filter((x) => x !== id) })),
    }),
    { name: 'p31-forge-ui' },
  ),
)