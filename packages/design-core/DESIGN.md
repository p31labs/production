---
name: "P31 Quantum Material"
colors:
  primary: "oklch(0.70 0.15 200)"
  accent:
    default: "oklch(0.70 0.15 200)"
    gold: "oklch(0.72 0.15 40)"
    green: "oklch(0.70 0.15 160)"
    red: "oklch(0.70 0.15 20)"
    violet: "oklch(0.65 0.15 250)"
  surface:
    background: "oklch(0.10 0.03 240)"
    raised: "oklch(0.15 0.04 240)"
  glass:
    background: "oklch(1 0.01 230 / 0.04)"
    border: "oklch(1 0.01 230 / 0.08)"
  text:
    primary: "oklch(0.95 0.02 230)"
    secondary: "oklch(0.78 0.02 235)"
typography:
  fontFamily: "Space Grotesk"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
rounded:
  sm: "8px"
  md: "16px"
  full: "9999px"
---

# P31 Quantum Material

A neurodivergent-first, sovereign design system. Dark-first, glass, OKLCH.

## Design Philosophy

- **Quantum Material.** Everything derives from a 16px base unit, timed to the
  863 Hz Larmor frequency of phosphorus-31. One base, one ratio, infinite scale.
- **Perceptual color.** All color is authored in OKLCH, not hex. Hue and chroma
  stay fixed while lightness moves — so the light theme matches the dark one
  without a second hand-picked palette.
- **Glass, not chrome.** Surfaces are translucent (`glass.background` at 4%
  white with backdrop blur), never flat. Borders are 8% white, never solid.
- **Spoon-aware.** Every surface degrades gracefully at low cognitive energy
  (spoons 0–1): no motion, no blur, CrisisOverlay is the only chrome.

## Color

- `accent.default` — the primary accent (cyan-leaning, hue 200). Used for
  actions, focus, and the "phosphorus" glow.
- `accent.gold/green/red` — status accents (milestone, success, error).
- `accent.violet` — the secondary/alt accent.
- `surface.background/raised` — the near-black void (hue 240, very low chroma).
- `text.primary/secondary` — near-white, chroma-2 for readability.

## Typography

- Sans: Space Grotesk. Mono: JetBrains Mono. Both are expressive at display sizes
  and stay legible at body sizes.
- Type is sized on the 16px × (4/3)ⁿ scale, not a fixed point list.

## Spacing

- 4/8/16/24/32 — powers and multiples of the base unit, derived from the
  tetrahedral ratio, not arbitrary.

## Components

32 compositions live in `@p31ca/design-core/compositions`, each with a contract
(`tokenContract`) and a lifecycle `tier` (`core` / `experimental` / `deprecated`).
Compose from the catalog; never fork.

## Rules

- Every color resolves to a `p31.*` token. No hardcoded hex or raw rgba.
- The shell owns geometry; the component owns appearance.
- Themes are value swaps at the semantic tier, never component forks.
- Crisis (spoons 0) = no motion, no blur, CrisisOverlay only.