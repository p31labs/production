/**
 * P31 color system — Pattern B (semantic-first).
 * Ramps are the single source of truth; compiled to CSS custom
 * properties by `scripts/gen-tokens.mts` → src/generated/color-palette.css.
 * Dark mode inverts semantic aliases via prefers-color-scheme.
 */

export const colorRamps = {
  // Neutral
  neutral: ['#ffffff', '#f9f8f3', '#e8e6db', '#d3d1c7', '#888780', '#5f5e5a', '#444441', '#2c2c2a'],

  // Semantic (matches intended use)
  accent: ['#e6f1fb', '#b5d4f4', '#85b7eb', '#378add', '#185fa5', '#0c447c', '#042c53'],
  danger: ['#fcebeb', '#f7c1c1', '#f09595', '#e24b4a', '#a32d2d', '#791f1f', '#501313'],
  success: ['#eaf3de', '#c0dd97', '#97c459', '#639922', '#3b6d11', '#27500a', '#173404'],
  warning: ['#faeeda', '#fac775', '#ef9f27', '#ba7517', '#854f0b', '#633806', '#412402'],

  // Decorative (use only when semantic doesn't apply)
  teal: ['#e1f5ee', '#9fe1cb', '#5dcaa5', '#1d9e75', '#0f6e56', '#085041', '#04342c'],
  purple: ['#eeedfe', '#cecbf6', '#afa9ec', '#7f77dd', '#534ab7', '#3c3489', '#26215c'],
  coral: ['#faece7', '#f5c4b3', '#f0997b', '#d85a30', '#993c1d', '#712b13', '#4a1b0c'],
  pink: ['#fbeaf0', '#f4c0d1', '#ed93b1', '#d4537e', '#993556', '#72243e', '#4b1528'],
} as const;

export type RampName = keyof typeof colorRamps;

/** Step labels for the 7-entry ramps (light → dark). */
export const RAMP_STEPS = ['50', '100', '200', '400', '600', '800', '900'] as const;

/** Base shade index used for bare `--p31-{ramp}` aliases (= #378add for accent). */
export const RAMP_BASE_INDEX = 3;

export const colorTokens = {
  bg: {
    page: 'var(--p31-bg)',
    card: 'var(--p31-surface)',
    elevated: 'var(--p31-surface-s2)',
    glass: 'var(--p31-glass-bg)',
    glassDark: 'var(--p31-glass-bg-strong)',
  },
  text: {
    primary: 'var(--p31-text)',
    secondary: 'var(--p31-text-secondary)',
    muted: 'var(--p31-text-tertiary)',
    accent: 'var(--p31-accent)',
    danger: 'var(--p31-status-error)',
    success: 'var(--p31-status-online)',
    warning: 'var(--p31-status-warning)',
  },
  border: {
    default: '1px solid var(--p31-glass-border)',
    strong: '1px solid var(--p31-glass-border-strong)',
    accent: '1px solid var(--p31-accent)',
    danger: '1px solid var(--p31-status-error)',
  },
} as const;
