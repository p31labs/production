import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const THEMES = ['dark', 'slate', 'nord'];

export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',

      setTheme: (theme) => {
        if (THEMES.includes(theme)) {
          set({ theme });
          document.documentElement.setAttribute('data-theme', theme);
        }
      },

      cycleTheme: () =>
        set((state) => {
          const idx = THEMES.indexOf(state.theme);
          const next = THEMES[(idx + 1) % THEMES.length];
          document.documentElement.setAttribute('data-theme', next);
          return { theme: next };
        }),
    }),
    {
      name: 'willow-theme-store',
      partialize: (state) => ({ theme: state.theme }),
    }
  )
);
