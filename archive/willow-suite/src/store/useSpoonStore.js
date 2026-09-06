import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSpoonStore = create(
  persist(
    (set) => ({
      childSpoons: 4,
      teenSpoons: 3,

      setChildSpoons: (n) => set({ childSpoons: Math.max(0, Math.min(5, n)) }),
      setTeenSpoons: (n) => set({ teenSpoons: Math.max(0, Math.min(5, n)) }),

      spoonHistory: [],

      logSpoonChange: (user, level) =>
        set((state) => ({
          spoonHistory: [
            {
              user,
              level,
              timestamp: Date.now(),
              iso: new Date().toISOString(),
            },
            ...state.spoonHistory,
          ].slice(0, 200),
        })),
    }),
    {
      name: 'willow-spoon-store',
      partialize: (state) => ({
        childSpoons: state.childSpoons,
        teenSpoons: state.teenSpoons,
        spoonHistory: state.spoonHistory,
      }),
    }
  )
);
