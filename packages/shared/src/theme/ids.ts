/**
 * P31 Canonical Theme ID Registry — single source of truth for theme
 * identity across design-core, shell-chrome, and all surfaces.
 *
 * Merged from:
 *   - design-core/src/themes/themes.ts  (cipher, garden, retro, ocean, sunset, mono)
 *   - shell-chrome/stores/types.ts      (garden, ocean, aurora, zen, volt)
 *
 * Plus aliases for legacy theme names so nothing regresses at runtime.
 */

export type ThemeId =
  | 'cipher'
  | 'garden'
  | 'retro'
  | 'ocean'
  | 'sunset'
  | 'mono'
  | 'aurora'
  | 'zen'
  | 'volt'
  | 'family'
  | 'sunlight';

/**
 * Legacy theme names → canonical ThemeId. Unknown names also resolve to
 * DEFAULT_THEME so a stray attribute can never produce an invalid theme.
 */
export const THEME_ALIASES: Record<string, ThemeId> = {
  rebel: 'ocean',
  quantum: 'cipher',
  dusk: 'sunset',
  dawn: 'ocean',
  lime: 'garden',
};

export const DEFAULT_THEME: ThemeId = 'ocean';

export const ALL_THEME_IDS: readonly ThemeId[] = [
  'cipher',
  'garden',
  'retro',
  'ocean',
  'sunset',
  'mono',
  'aurora',
  'zen',
  'volt',
  'family',
  'sunlight',
];

/** Resolve any stored/DOM theme name to a canonical ThemeId. */
export function resolveTheme(themeId: string | null | undefined): ThemeId {
  if (!themeId) return DEFAULT_THEME;
  if (ALL_THEME_IDS.includes(themeId as ThemeId)) return themeId as ThemeId;
  return THEME_ALIASES[themeId] ?? DEFAULT_THEME;
}