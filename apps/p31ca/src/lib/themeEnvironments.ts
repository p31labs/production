/**
 * @file themeEnvironments.ts — the 5 P31 canon theme environments.
 *
 * The design portal's theming set, verbatim: garden, ocean, aurora, zen,
 * volt. This is the single user-facing environment list — the overflow
 * ThemePicker and the LED controller ENV tab both read it. Page themes
 * (rose/sunlight/cipher…) are resolved separately by the shell and are NOT
 * offered as user choices here.
 *
 * Pure + edge-safe. The CSS in molecular-dome.css carries the same tokens
 * as data-theme blocks; this module is the source of truth for TS consumers
 * (ThemePicker previews, tests).
 */

export type EnvironmentId =
  | 'garden' | 'ocean' | 'aurora' | 'zen' | 'volt'

export interface Environment {
  id: EnvironmentId
  label: string
  /** Hull wireframe base — the faint struts. */
  hull: string
  /** Mesh node dots + grid accents. */
  mesh: string
  /** Heart's inner plasma core. */
  heartCore: string
  /** Heart's outer plasma. */
  heartPlasma: string
  /** Warm star tint. */
  starWarm: string
  /** Cool star tint. */
  starCool: string
  /** UI accent (matches --p31-accent for coherence). */
  accent: string
  /** The perimeter LED default color for this theme. */
  perimeter: string
}

export const ENVIRONMENTS: Record<EnvironmentId, Environment> = {
  garden: {
    id: 'garden', label: 'Garden',
    hull: 'oklch(0.58 0.12 130)',
    mesh: 'oklch(0.72 0.16 135)',
    heartCore: 'oklch(0.78 0.16 85)',
    heartPlasma: 'oklch(0.62 0.14 150)',
    starWarm: 'oklch(0.88 0.10 80)',
    starCool: 'oklch(0.68 0.12 140)',
    accent: 'oklch(0.72 0.16 130)',
    perimeter: 'oklch(0.75 0.18 130)',
  },
  ocean: {
    id: 'ocean', label: 'Ocean',
    hull: 'oklch(0.55 0.12 230)',
    mesh: 'oklch(0.68 0.14 220)',
    heartCore: 'oklch(0.78 0.14 200)',
    heartPlasma: 'oklch(0.52 0.16 250)',
    starWarm: 'oklch(0.82 0.06 220)',
    starCool: 'oklch(0.62 0.14 240)',
    accent: 'oklch(0.72 0.16 210)',
    perimeter: 'oklch(0.72 0.16 210)',
  },
  aurora: {
    id: 'aurora', label: 'Aurora',
    hull: 'oklch(0.55 0.16 285)',
    mesh: 'oklch(0.68 0.18 275)',
    heartCore: 'oklch(0.78 0.16 280)',
    heartPlasma: 'oklch(0.58 0.18 200)',
    starWarm: 'oklch(0.82 0.08 300)',
    starCool: 'oklch(0.62 0.16 250)',
    accent: 'oklch(0.70 0.18 280)',
    perimeter: 'oklch(0.75 0.18 280)',
  },
  zen: {
    id: 'zen', label: 'Zen',
    hull: 'oklch(0.58 0.06 160)',
    mesh: 'oklch(0.72 0.08 160)',
    heartCore: 'oklch(0.80 0.06 160)',
    heartPlasma: 'oklch(0.55 0.08 180)',
    starWarm: 'oklch(0.84 0.04 80)',
    starCool: 'oklch(0.65 0.06 180)',
    accent: 'oklch(0.72 0.08 160)',
    perimeter: 'oklch(0.78 0.08 160)',
  },
  volt: {
    id: 'volt', label: 'Volt',
    hull: 'oklch(0.62 0.20 85)',
    mesh: 'oklch(0.78 0.22 85)',
    heartCore: 'oklch(0.86 0.20 90)',
    heartPlasma: 'oklch(0.60 0.22 70)',
    starWarm: 'oklch(0.90 0.14 85)',
    starCool: 'oklch(0.68 0.18 100)',
    accent: 'oklch(0.80 0.20 85)',
    perimeter: 'oklch(0.82 0.22 85)',
  },
}

export const ENVIRONMENT_IDS: EnvironmentId[] = [
  'garden', 'ocean', 'aurora', 'zen', 'volt',
]

export function environmentFor(id: string): Environment {
  const env = ENVIRONMENTS[id as EnvironmentId]
  return env ?? ENVIRONMENTS.ocean
}