import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Spoons = 0 | 1 | 2 | 3 | 4 | 5;

interface SpoonState {
  spoons: Spoons;
  maxSpoons: Spoons;
  setSpoons: (next: number) => void;
}

const STORAGE_KEY = 'p31:spoons';

function clampSpoons(next: number): Spoons {
  return Math.max(0, Math.min(5, Math.round(next))) as Spoons;
}

function initialSpoons(): Spoons {
  if (typeof window === 'undefined') return 3;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return 3;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? clampSpoons(parsed) : 3;
}

export const useSpoons = create<SpoonState>()(
  persist(
    (set) => ({
      spoons: initialSpoons(),
      maxSpoons: 3 as Spoons,
      setSpoons: (next) => {
        const level = clampSpoons(next);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(STORAGE_KEY, String(level));
          window.document.documentElement.setAttribute('data-spoons', String(level));
          window.document.documentElement.style.setProperty('--p31-spoon-level', String(level));
        }
        set({ spoons: level });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ spoons: state.spoons }),
    }
  )
);
