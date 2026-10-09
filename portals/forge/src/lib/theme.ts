/**
 * theme.ts — thin re-export of the canon Chameleon theme system.
 *
 * The single source of truth is @p31ca/design-core/theming/theme-store
 * (5 themes × age tiers + sensory modes, all OKLCH). This module exists only
 * to give the forge a stable local import surface; it adds NO tokens of its
 * own — every value comes from the canon.
 */
import { THEME_LABELS, THEME_TOKENS, useThemeStore } from '@p31ca/design-core/theming/theme-store';

export type ThemeId = keyof typeof THEME_LABELS;

export const THEMES = (Object.keys(THEME_LABELS) as ThemeId[]).map((id) => ({
  id,
  label: THEME_LABELS[id],
  swatch: THEME_TOKENS[id]?.['--p31-accent'] ?? 'oklch(73% 0.18 195)',
}));

export { useThemeStore, THEME_LABELS, THEME_TOKENS };

/** Apply a theme immediately + persist (via the canon store). */
export function applyTheme(theme: ThemeId): void {
  useThemeStore.getState().setTheme(theme);
}

/** Current theme from the canon store. */
export function getCurrentTheme(): ThemeId {
  return useThemeStore.getState().theme;
}

/** Idempotent boot: re-apply whatever the canon store has persisted. */
export function initTheme(): void {
  useThemeStore.getState().applyTheme();
}