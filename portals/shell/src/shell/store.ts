/**
 * shell/store.ts — the shell console store.
 *
 * Holds the face registry, the active face, and the theme. The user's picked
 * theme travels across faces; a face's themeDefault applies only on first
 * load if the user never picked (the theme-travel rule).
 */
import { create } from 'zustand';
import type { FaceManifest } from './face';

export interface FaceRegistry {
  /** Ordered face ids — the switcher order. */
  order: string[];
  /** id → manifest. The active face's id is `active`. */
  byId: Record<string, FaceManifest>;
}

export interface ShellState {
  registry: FaceRegistry;
  active: string;
  userPickedTheme: boolean;
  userTheme: string | null;
  /** Cognitive load 0–5 (the spoon meter). 0 = crisis. */
  spoons: number;
  reduceMotion: boolean;

  register: (m: FaceManifest) => void;
  activate: (id: string) => void;
  pickTheme: (theme: string) => void;
  setSpoons: (level: number) => void;
  setReduceMotion: (v: boolean) => void;
}

export const useShellStore = create<ShellState>((set, get) => ({
  registry: { order: [], byId: {} },
  active: '',
  userPickedTheme: false,
  userTheme: null,
  spoons: 3,
  reduceMotion: false,

  register(m) {
    const { registry } = get();
    if (registry.byId[m.id]) return; // idempotent
    set({
      registry: {
        order: [...registry.order, m.id],
        byId: { ...registry.byId, [m.id]: m },
      },
      active: get().active || m.id,
    });
  },

  activate(id) {
    const { registry } = get();
    if (!registry.byId[id]) return;
    set({ active: id });
    const face = registry.byId[id];
    if (face.themeDefault && !get().userPickedTheme) {
      document.documentElement.dataset.theme = face.themeDefault;
    }
  },

  pickTheme(theme) {
    set({ userPickedTheme: true, userTheme: theme });
    document.documentElement.dataset.theme = theme;
  },

  setSpoons(level) {
    const spoons = Math.max(0, Math.min(5, Math.round(level)));
    set({ spoons });
    // The motion-scale curve: 4–5 full, 3 at 0.6, 1–2 at 0.2, 0 at zero.
    const scale = spoons >= 4 ? '1' : spoons === 3 ? '0.6' : spoons >= 1 ? '0.2' : '0';
    document.documentElement.style.setProperty('--motion-scale', scale);
    document.documentElement.dataset.spoons = String(spoons);
    document.documentElement.style.setProperty('--p31-spoon-level', String(spoons));
  },

  setReduceMotion(v) {
    set({ reduceMotion: v });
    document.documentElement.classList.toggle('is-reduced-motion', v);
    if (v) document.documentElement.style.setProperty('--motion-scale', '0.01');
  },
}));

/** Resolve the effective theme: user pick wins, else active face default. */
export function resolveShellTheme(state: Pick<ShellState, 'userTheme' | 'userPickedTheme' | 'active' | 'registry'>): string | null {
  if (state.userPickedTheme && state.userTheme) return state.userTheme;
  const face = state.registry.byId[state.active];
  return face?.themeDefault ?? null;
}