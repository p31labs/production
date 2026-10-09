/**
 * themeStore — p31ca LedController theme shim. The design portal owns theming
 * via @p31ca/design-core; this only satisfies the controller's theme/setTheme
 * surface so the vendored slice stays self-contained.
 */
import { create } from 'zustand';

interface ThemeState {
  theme: string;
  setTheme: (t: string) => void;
  cycleTheme: () => string;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'ocean',
  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
  },
  cycleTheme: () => {
    const next = get().theme === 'ocean' ? 'volt' : 'ocean';
    set({ theme: next });
    return next;
  },
}));
