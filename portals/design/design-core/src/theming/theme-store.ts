// theme-store.ts — P31 Chameleon: 5 themes × 3 age tiers + sensory modes.
// Ported verbatim-in-spirit from production/shell useThemeStore.
// Drives CSS cascade via data-theme + data-age on <html>.
// Sensory modes (muted / warmLight) are pure OKLCH math: chroma scaled with
// lightness held constant (contrast invariant by construction), hue blended
// toward amber (dusk) when warmLight is active.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { parse, formatCss, oklch as toOklch } from 'culori';

export type ThemeId = 'garden' | 'ocean' | 'aurora' | 'zen' | 'volt';
export type AgeTier = 'child' | 'teen' | 'adult';

interface ThemeState {
  theme: ThemeId;
  age: AgeTier;
  muted: boolean;
  warmLight: boolean;
  setTheme: (theme: ThemeId) => void;
  setAge: (age: AgeTier) => void;
  setMuted: (muted: boolean) => void;
  setWarmLight: (warmLight: boolean) => void;
  applyTheme: () => void;
}

/** Star colors feed the jitterbug molecular background. */
declare global {
  interface Window {
    __P31_STAR_COLORS__?: { warm: string; cool: string };
  }
}

export const THEME_TOKENS: Record<ThemeId, Record<string, string>> = {
  garden: {
    '--p31-accent': 'oklch(69% 0.14 45)',
    '--p31-accent-alt': 'oklch(0.69 0.09 150)',
    '--p31-accent-green': 'oklch(0.68 0.12 152)',
    '--p31-accent-red': 'oklch(0.71 0.13 22)',
    '--p31-accent-gold': 'oklch(0.7 0.135 88)',
    '--p31-accent-violet': 'oklch(0.71 0.1 28)',
    '--p31-bg': 'oklch(14% 0.014 75)',
    '--p31-surface': 'oklch(19% 0.017 74)',
    '--p31-surface2': 'oklch(25% 0.02 72)',
    '--p31-text': 'oklch(93% 0.012 80)',
    '--p31-text-secondary': 'oklch(78% 0.018 75)',
    '--p31-text-tertiary': 'oklch(70% 0.015 75)',
    '--p31-glass-bg': 'oklch(100% 0.01 75 / 0.20)',
    '--p31-glass-border': 'oklch(100% 0.01 75 / 0.16)',
    '--p31-star-warm': '#d9a066',
    '--p31-star-cool': '#8a7a68',
  },
  ocean: {
    '--p31-accent': 'oklch(65% 0.18 195)',
    '--p31-accent-alt': 'oklch(0.71 0.18 285)',
    '--p31-accent-green': 'oklch(0.69 0.18 105)',
    '--p31-accent-red': 'oklch(0.71 0.18 20)',
    '--p31-accent-gold': 'oklch(0.71 0.18 15)',
    '--p31-accent-violet': 'oklch(0.7 0.14 275)',
    '--p31-bg': 'oklch(10% 0.01 240)',
    '--p31-surface': 'oklch(15% 0.015 240)',
    '--p31-surface2': 'oklch(22% 0.02 240)',
    '--p31-text': 'oklch(96% 0.005 240)',
    '--p31-text-secondary': 'oklch(77% 0.01 240)',
    '--p31-text-tertiary': 'oklch(69% 0.01 240)',
    '--p31-glass-bg': 'oklch(100% 0.01 240 / 0.20)',
    '--p31-glass-border': 'oklch(100% 0.01 240 / 0.16)',
    '--p31-star-warm': '#22d3ee',
    '--p31-star-cool': '#8b5cf6',
  },
  aurora: {
    '--p31-accent': 'oklch(63% 0.22 160)',
    '--p31-accent-alt': 'oklch(0.72 0.22 330)',
    '--p31-accent-green': 'oklch(0.68 0.2 130)',
    '--p31-accent-red': 'oklch(0.72 0.22 350)',
    '--p31-accent-gold': 'oklch(0.7 0.18 90)',
    '--p31-accent-violet': 'oklch(0.74 0.22 280)',
    '--p31-bg': 'oklch(12% 0.025 250)',
    '--p31-surface': 'oklch(18% 0.025 200)',
    '--p31-surface2': 'oklch(25% 0.025 180)',
    '--p31-text': 'oklch(95% 0.01 100)',
    '--p31-text-secondary': 'oklch(77% 0.02 130)',
    '--p31-text-tertiary': 'oklch(70% 0.02 180)',
    '--p31-glass-bg': 'oklch(100% 0.01 180 / 0.20)',
    '--p31-glass-border': 'oklch(100% 0.01 180 / 0.16)',
    '--p31-star-warm': '#a78bfa',
    '--p31-star-cool': '#38bdf8',
  },
  zen: {
    '--p31-accent': 'oklch(68% 0.01 100)',
    '--p31-accent-alt': 'oklch(0.69 0.01 100)',
    '--p31-accent-green': 'oklch(0.69 0.01 150)',
    '--p31-accent-red': 'oklch(0.69 0.005 30)',
    '--p31-accent-gold': 'oklch(0.69 0.01 90)',
    '--p31-accent-violet': 'oklch(0.69 0.005 280)',
    '--p31-bg': 'oklch(10% 0.005 100)',
    '--p31-surface': 'oklch(16% 0.005 100)',
    '--p31-surface2': 'oklch(22% 0.005 100)',
    '--p31-text': 'oklch(92% 0.005 100)',
    '--p31-text-secondary': 'oklch(77% 0.005 100)',
    '--p31-text-tertiary': 'oklch(69% 0.005 100)',
    '--p31-glass-bg': 'oklch(100% 0.002 100 / 0.20)',
    '--p31-glass-border': 'oklch(100% 0.002 100 / 0.16)',
    '--p31-star-warm': '#64748b',
    '--p31-star-cool': '#475569',
  },
  volt: {
    '--p31-accent': 'oklch(80% 0.22 105)',
    '--p31-accent-alt': 'oklch(0.69 0.18 80)',
    '--p31-accent-green': 'oklch(0.67 0.2 130)',
    '--p31-accent-red': 'oklch(0.7 0.18 30)',
    '--p31-accent-gold': 'oklch(0.68 0.2 90)',
    '--p31-accent-violet': 'oklch(0.7 0.18 280)',
    '--p31-bg': 'oklch(5% 0.01 240)',
    '--p31-surface': 'oklch(12% 0.015 240)',
    '--p31-surface2': 'oklch(18% 0.02 240)',
    '--p31-text': 'oklch(98% 0.015 105)',
    '--p31-text-secondary': 'oklch(80% 0.01 100)',
    '--p31-text-tertiary': 'oklch(69% 0.01 100)',
    '--p31-glass-bg': 'oklch(100% 0.01 100 / 0.20)',
    '--p31-glass-border': 'oklch(100% 0.01 100 / 0.16)',
    '--p31-star-warm': '#fbbf24',
    '--p31-star-cool': '#f59e0b',
  },
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'ocean', // design portal default — legacy continuity
      age: 'adult',
      muted: false,
      warmLight: false,

      setTheme: (theme) => { set({ theme }); get().applyTheme(); },
      setAge: (age) => { set({ age }); get().applyTheme(); },
      setMuted: (muted) => { set({ muted }); get().applyTheme(); },
      setWarmLight: (warmLight) => { set({ warmLight }); get().applyTheme(); },

      applyTheme: () => {
        const { theme, age, muted, warmLight } = get();
        const tokens = THEME_TOKENS[theme];
        const root = document.documentElement;

        Object.entries(tokens).forEach(([key, value]) => {
          root.style.setProperty(key, transformToken(value, { muted, warmLight }));
        });

        root.setAttribute('data-theme', theme);
        root.setAttribute('data-age', age);
        window.__P31_STAR_COLORS__ = {
          warm: tokens['--p31-star-warm'],
          cool: tokens['--p31-star-cool'],
        };

        // Age-specific font scaling
        root.style.fontSize = age === 'child' ? '17px' : '15px';
      },
    }),
    { name: 'p31-portal-theme' }
  )
);

// ─── Sensory OKLCH transform ───
const MUTED_CHROMA = 0.45;
const WARM_HUE = 60; // amber
const WARM_BLEND = 0.5;

function blendHue(h: number, target: number, t: number): number {
  const d = ((target - h + 540) % 360) - 180;
  return (h + d * t + 360) % 360;
}

function transformToken(value: string, sensory: { muted: boolean; warmLight: boolean }): string {
  if (!sensory.muted && !sensory.warmLight) return value;
  const parsed = parse(value);
  if (!parsed) return value;

  let color: { mode: 'oklch'; l: number; c: number; h?: number; alpha?: number } =
    parsed.mode === 'oklch' ? (parsed as never) : (toOklch(parsed as never) as never);

  if (sensory.muted) color = { ...color, c: Math.max(0, color.c * MUTED_CHROMA) };
  if (sensory.warmLight && color.h !== undefined) {
    color = { ...color, h: blendHue(color.h, WARM_HUE, WARM_BLEND) };
  }
  return formatCss(color);
}
