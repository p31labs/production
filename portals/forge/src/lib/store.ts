import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { useThemeStore } from '@p31ca/design-core/theming/theme-store'

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
      mode: 'dark',
      spoons: 5,
      paletteOpen: false,
      compileQueue: [],
      // The chameleon shell: the forge's world IS the canon theme. setWorld
      // writes the local alias (backward compat) AND syncs the canon
      // theme-store state. The DOM data-theme is applied by App's effect —
      // this keeps the sync node-safe (the canon setTheme's applyTheme is
      // browser-only).
      setWorld: (world) => {
        set({ world })
        useThemeStore.setState({ theme: world })
      },
      setMode: (mode) => set({ mode }),
      setSpoons: (n) => set({ spoons: Math.max(0, Math.min(5, n)) }),
      togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
      enqueueCompile: (id) => set((s) => ({ compileQueue: [...new Set([...s.compileQueue, id])] })),
      dequeueCompile: (id) => set((s) => ({ compileQueue: s.compileQueue.filter((x) => x !== id) })),
    }),
    { name: 'p31-forge-ui-v2' },
  ),
)