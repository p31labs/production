import { create } from 'zustand';

interface SpoonsState {
  spoons: number;
  maxSpoons: number;
  setSpoons: (spoons: number) => void;
}

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));

export const useSpoonsStore = create<SpoonsState>((set) => ({
  spoons: 3,
  maxSpoons: 5,
  setSpoons: (spoons) => {
    const max = useSpoonsStore.getState().maxSpoons;
    const next = clamp(spoons, max);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--p31-spoon-level', String(next));
      document.documentElement.setAttribute('data-spoons', String(next));
    }
    set({ spoons: next });
  },
}));