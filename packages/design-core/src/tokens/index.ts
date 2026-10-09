import { COLORS, GLASS, STARFIELD, GOVERNANCE, VOID_OKLCH, SURFACE_OKLCH, ACCENT_OKLCH } from '../math/colors';
import type { OKLCH, RGB } from '../math/colors';
import { FONT_SIZES, FONT_FAMILY, TYPOGRAPHY } from '../math/typography';
import { SPACING, SPACING_SEMANTIC, RADII } from '../math/spacing';
import { DURATIONS, EASING, SPOON_MOTION, spoonDuration } from '../math/motion';
import { PHI, BASE, RATIO, SPACE_BASE, TEMPO, BEAT } from '../math/constants';
import { scale, round } from '../math/scale';

export {
  COLORS, GLASS, STARFIELD, GOVERNANCE, VOID_OKLCH, SURFACE_OKLCH, ACCENT_OKLCH,
  FONT_SIZES, FONT_FAMILY, TYPOGRAPHY,
  SPACING, SPACING_SEMANTIC, RADII,
  DURATIONS, EASING, SPOON_MOTION, spoonDuration,
  PHI, BASE, RATIO, SPACE_BASE, TEMPO, BEAT,
  scale, round,
};
export type { OKLCH, RGB };

// Density — the capacity-aware presentation tiers. Each tier maps a spoon
// band to a UI density factor. `densityForSpoons` is the governance query:
// given a capacity level, what density is the human capable of perceiving?
export type DensityLevel = 'comfortable' | 'compact' | 'sparse';

export const DENSITY = {
  comfortable: { factor: 1, spoons: [4, 5] },
  compact: { factor: 0.8, spoons: [2, 3] },
  sparse: { factor: 0.5, spoons: [0, 1] },
} as const;

export function densityForSpoons(spoons: number): DensityLevel {
  if (spoons <= 1) return 'sparse';
  if (spoons <= 3) return 'compact';
  return 'comfortable';
}

export const TOKENS = {
  colors: COLORS,
  glass: GLASS,
  radii: RADII,
  spacing: SPACING,
  spacingSemantic: SPACING_SEMANTIC,
  typography: TYPOGRAPHY,
  fontSizes: FONT_SIZES,
  durations: DURATIONS,
  easing: EASING,
} as const;
