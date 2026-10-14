import { create } from 'zustand';
import type { ThemeId } from '@p31ca/shared/theme/ids';
import { ALL_THEME_IDS, resolveTheme } from '@p31ca/shared/theme/ids';

interface ThemeState {
  theme: ThemeId;
  syncFromDom: () => void;
  applyTheme: () => void;
  setTheme: (theme: ThemeId) => void;
  cycleTheme: () => ThemeId;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'ocean',
  syncFromDom: () => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('p31:theme') : null;
    if (stored) {
      set({ theme: resolveTheme(stored) });
    }
  },
  applyTheme: () => {
    const theme = get().theme;
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },
  // Canonical theme write: one path for every switcher (ThemePicker,
  // LedController env tab, topbar cycle) — set state, persist, apply DOM.
  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem('p31:theme', theme);
    }
    get().applyTheme();
  },
  cycleTheme: () => {
    const current = get().theme;
    const idx = ALL_THEME_IDS.indexOf(current);
    const next = ALL_THEME_IDS[(idx + 1) % ALL_THEME_IDS.length]!;
    set({ theme: next });
    if (typeof window !== 'undefined') {
      localStorage.setItem('p31:theme', next);
    }
    return next;
  },
}));
