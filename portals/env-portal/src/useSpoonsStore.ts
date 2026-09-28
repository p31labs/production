import { create } from 'zustand';

export interface SpoonsState {
  spoons: number;
  setSpoons: (n: number) => void;
}

const clamp = (n: number) => Math.max(0, Math.min(5, Math.round(n)));

export const useSpoonsStore = create<SpoonsState>((set) => ({
  spoons: 3,
  setSpoons: (spoons) => {
    const next = clamp(spoons);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--motion-scale', next >= 4 ? '1' : next === 3 ? '0.6' : next >= 1 ? '0.2' : '0');
      document.documentElement.setAttribute('data-spoons', String(next));
      document.body.setAttribute('data-spoons', String(next));
    }
    set({ spoons: next });
  },
}));