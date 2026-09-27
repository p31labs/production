import { useEffect, useRef } from 'react';
import { useThemeStore } from '@p31ca/design-core/theming/theme-store';
import { useQpjStore } from '../store/useQpjStore';

const SPACE_TOKENS: Record<string, string> = {
  '--p31-bg': 'oklch(15% 0.02 75)',
  '--p31-bg-deep': 'oklch(12% 0.02 75)',
  '--p31-surface': 'oklch(18.5% 0.026 75)',
  '--p31-surface2': 'oklch(23% 0.03 75)',
  '--p31-border': 'oklch(30% 0.03 75)',
  '--p31-border-strong': 'oklch(38% 0.035 75)',
  '--p31-muted': 'oklch(20% 0.022 75)',
  '--p31-accent-bright': 'oklch(72% 0.12 75)',
  '--p31-accent-glow': 'oklch(82% 0.09 80 / 0.55)',
  '--p31-accent-soft': 'oklch(28% 0.045 78)',
  '--p31-text': 'oklch(92% 0.008 75)',
  '--p31-text-secondary': 'oklch(72% 0.02 75)',
  '--p31-text-tertiary': 'oklch(60% 0.02 75)',
  '--p31-lantern': 'oklch(76% 0.13 60)',
  '--p31-star': 'oklch(82% 0.125 90)',
  '--p31-glass-blur': '20px',
};

const LANTERN_TOKENS: Record<string, string> = {
  '--p31-bg': 'oklch(98% 0.012 85)',
  '--p31-bg-deep': 'oklch(95% 0.016 82)',
  '--p31-surface': 'oklch(96% 0.018 80)',
  '--p31-surface2': 'oklch(93% 0.022 78)',
  '--p31-border': 'oklch(89% 0.022 85)',
  '--p31-border-strong': 'oklch(82% 0.028 85)',
  '--p31-muted': 'oklch(94% 0.014 82)',
  '--p31-accent-bright': 'oklch(63% 0.125 75)',
  '--p31-accent-glow': 'oklch(82% 0.09 80 / 0.45)',
  '--p31-accent-soft': 'oklch(93% 0.045 80)',
  '--p31-text': 'oklch(20% 0.028 75)',
  '--p31-text-secondary': 'oklch(45% 0.028 80)',
  '--p31-text-tertiary': 'oklch(58% 0.028 80)',
  '--p31-lantern': 'oklch(74% 0.13 60)',
  '--p31-star': 'oklch(80% 0.125 90)',
  '--p31-glass-blur': '16px',
};

const QUANTUM_GLASS_TOKENS: Record<string, string> = {
  '--p31-bg': 'oklch(6% 0.008 265)',
  '--p31-bg-deep': 'oklch(4% 0.006 265)',
  '--p31-surface': 'oklch(11% 0.012 265)',
  '--p31-surface2': 'oklch(17% 0.02 265)',
  '--p31-border': 'oklch(26% 0.03 265)',
  '--p31-border-strong': 'oklch(34% 0.035 265)',
  '--p31-muted': 'oklch(13% 0.014 265)',
  '--p31-accent-bright': 'oklch(90% 0.13 195)',
  '--p31-accent-glow': 'oklch(83% 0.16 195 / 0.55)',
  '--p31-accent-soft': 'oklch(28% 0.045 195)',
  '--p31-text': 'oklch(97% 0.003 265)',
  '--p31-text-secondary': 'oklch(71% 0.01 265)',
  '--p31-text-tertiary': 'oklch(51% 0.01 265)',
  '--p31-lantern': 'oklch(83% 0.16 195)',
  '--p31-star': 'oklch(82% 0.125 90)',
  '--p31-glass-blur': '20px',
};

const PACK_TOKENS: Record<string, Record<string, string>> = {
  space: SPACE_TOKENS,
  lantern: LANTERN_TOKENS,
  'quantum-glass': QUANTUM_GLASS_TOKENS,
};

function activePackTokens(): Record<string, string> {
  const { qpjTheme, mode } = useQpjStore.getState();
  const pack = PACK_TOKENS[qpjTheme] ?? SPACE_TOKENS;
  return mode === 'workshop' ? SPACE_TOKENS : pack;
}

function reassertPackTokens(): void {
  const root = document.documentElement;
  root.dataset.qpjTheme = useQpjStore.getState().qpjTheme;
  for (const [key, value] of Object.entries(activePackTokens())) {
    root.style.setProperty(key, value);
  }
}

/**
 * Keeps QPJ's own look above Chameleon's token swaps, per pack.
 *
 * The app boots on the dark "Space" palette (CSS-first paint, no flash).
 * The cream "Lantern" look and the design-core worlds are chooseable via the
 * ThemeCharm picker. Chameleon applies brand × world × age × sensory tokens
 * inline via `useThemeStore` (`applyTheme`). QPJ re-asserts its active pack
 * inline right after — subscribing to the theme store fires after Chameleon's
 * apply, so its pack always beats the world swap. Workshop mode forces Space
 * regardless of the chosen pack (creative surfaces stay on the starfield sky).
 */
export function useThemeEffects(): void {
  const mounted = useRef(false);
  const qpjTheme = useQpjStore((s) => s.qpjTheme);
  const mode = useQpjStore((s) => s.mode);

  useEffect(() => {
    reassertPackTokens();
    mounted.current = true;
    return useThemeStore.subscribe(() => {
      queueMicrotask(reassertPackTokens);
    });
  }, []);

  useEffect(() => {
    if (!mounted.current) return;
    reassertPackTokens();
  }, [qpjTheme, mode]);
}