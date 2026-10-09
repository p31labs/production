import { create } from 'zustand';

interface SpoonsState {
  spoons: number;
  maxSpoons: number;
  setSpoons: (n: number) => void;
}

/** Motion scale per spoon level — 4–5 → 1, 3 → 0.6, 1–2 → 0.2, 0 → 0. */
const SCALE: Record<number, string> = { 0: '0', 1: '0.2', 2: '0.2', 3: '0.6', 4: '1', 5: '1' };

const clamp = (n: number, max: number) => Math.max(0, Math.min(max, Math.round(n)));

const SPOON_KEY = 'p31:monetization:spoons';

/** Spoon profile — persist the user's capacity level across reloads. */
function loadSpoons(): number {
  try {
    const saved = localStorage.getItem(SPOON_KEY);
    const n = saved ? Number(saved) : NaN;
    if (!Number.isNaN(n)) return clamp(n, 5);
  } catch {
    // storage unavailable — default
  }
  return 3;
}

export const useSpoonsStore = create<SpoonsState>((set, get) => ({
  spoons: loadSpoons(),
  maxSpoons: 5,
  setSpoons: (n) => {
    const next = clamp(n, get().maxSpoons);
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.dataset.spoons = String(next);
      root.style.setProperty('--motion-scale', SCALE[next] ?? '1');
      root.style.setProperty('--p31-spoon-level', String(next));
    }
    try {
      localStorage.setItem(SPOON_KEY, String(next));
    } catch {
      // storage unavailable — keep in memory
    }
    set({ spoons: next });
  },
}));