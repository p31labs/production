/**
 * Page Theme Registry — the "full theming system" switchboard.
 *
 * Every surface declares its intended visual language through this registry:
 * which canon theme id, which ambient background, which display typography.
 * Components only ever read semantic `var(--p31-*)` tokens, so nothing is
 * clamped to a single look — the registry swaps the semantic layer per page.
 *
 * Per CREATE SOMETHING canon: navigation orients without demanding attention;
 * the destination stays primary. The background/motion levels are the P31
 * sensory contract: calm, spoon-aware, reduced-motion safe.
 */
/** Canon theme id — mirrors @p31/shared/theme/ids so canon stays dependency-light. */
export type ThemeId =
  | 'cipher' | 'garden' | 'retro' | 'ocean' | 'sunset' | 'mono'
  | 'aurora' | 'zen' | 'volt' | 'family' | 'sunlight'

export type AmbientBackground = 'dome' | 'heart' | 'calm-gradient' | 'mesh' | 'none';

export type DisplayType = 'serif-display' | 'sans-display' | 'mono-display';

export type MotionLevel = 'expressive' | 'calm' | 'minimal';

export interface PageThemeConfig {
  /** Canon theme id emitted as `data-theme` on <html>. */
  theme: ThemeId
  /** Ambient background layer for the starfield slot. */
  background: AmbientBackground
  /** Display typography for headlines/hero. */
  display: DisplayType
  /** Motion intensity floor (spoon scaling caps at this). */
  motion: MotionLevel
  /** Public-facing one-liner describing the mode. */
  mode: 'scene' | 'hub' | 'app' | 'org'
}

export const PAGE_THEMES: Record<string, PageThemeConfig> = {
  // ── The scene (dark, immersive, K4 glyph) ─────────────────────────────
  home: {
    theme: 'cipher',
    background: 'dome',
    display: 'mono-display',
    motion: 'expressive',
    mode: 'scene',
  },
  apps: {
    theme: 'cipher',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'scene',
  },
  arcade: {
    theme: 'sunset',
    background: 'dome',
    display: 'sans-display',
    motion: 'calm',
    mode: 'scene',
  },

  // ── The hub (warm editorial, conversion surfaces) ─────────────────────
  hire: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  enterprise: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  research: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  blog: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  about: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  donate: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },

  // ── The app (quantum depth, chain semantics) ──────────────────────────
  loom: {
    theme: 'cipher',
    background: 'heart',
    display: 'mono-display',
    motion: 'calm',
    mode: 'app',
  },
  qpj: {
    theme: 'family',
    background: 'heart',
    display: 'sans-display',
    motion: 'calm',
    mode: 'app',
  },
  spaceship: {
    theme: 'cipher',
    background: 'dome',
    display: 'mono-display',
    motion: 'calm',
    mode: 'app',
  },

  // ── The org (organic, emerald) ────────────────────────────────────────
  phosphorus: {
    theme: 'garden',
    background: 'mesh',
    display: 'sans-display',
    motion: 'calm',
    mode: 'org',
  },
  william: {
    theme: 'sunlight',
    background: 'heart',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  // ── Additional public surfaces (p31ca) ─────────────────────────────
  journey: {
    theme: 'ocean',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'scene',
  },
  'get-involved': {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  team: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  faq: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  'ways-to-give': {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  financials: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  'annual-report': {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  privacy: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  accessibility: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  terms: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  press: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  security: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  compliance: {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  },
  treasury: {
    theme: 'sunlight',
    background: 'dome',
    display: 'mono-display',
    motion: 'calm',
    mode: 'hub',
  },
  signin: {
    theme: 'sunlight',
    background: 'dome',
    display: 'sans-display',
    motion: 'minimal',
    mode: 'app',
  },
  signup: {
    theme: 'sunlight',
    background: 'dome',
    display: 'sans-display',
    motion: 'minimal',
    mode: 'app',
  },
}

/** Resolve a page key to a config; falls back to the hub mode. */
export function pageTheme(page: string): PageThemeConfig {
  return PAGE_THEMES[page] ?? {
    theme: 'sunlight',
    background: 'dome',
    display: 'serif-display',
    motion: 'calm',
    mode: 'hub',
  }
}