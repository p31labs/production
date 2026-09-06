# Tokens Reference

Generated CSS lands in `src/generated/` — never hand-edit those files.

## Color ramps (`color-palette.css`)

9 ramps × 7 steps (`50 100 200 400 600 800 900`), base alias at step 400:

`--p31-{neutral|accent|danger|success|warning|teal|purple|coral|pink}[-step]`

Semantic runtime aliases map onto live system vars:
`--p31-text-*`, `--p31-status-{error|warning|info|online|offline}`, `--p31-glass-*`.

Dark mode auto-inverts ramp direction for semantic aliases via `prefers-color-scheme`.

## Typography (`typography-scale.css`)

- Weights: `--p31-font-weight-body: 400` · `--p31-font-weight-emphasis: 500` — nothing else exists.
- Scale: `--p31-type-{caption|label|body|h3|h2|h1|display}` (11→34px).
- Stacks: `--p31-font-stack-sans` (Inter), `--p31-font-stack-mono` (JetBrains Mono).

## Motion & spoon ladder (`spoon-ladder.css`)

Base durations `--p31-motion-{fast|normal|slow}` = 150/300/500ms,
easings `--p31-motion-easing-{in|out|inout}`.

Each `[data-spoons="n"]` block overrides duration + `--p31-glass-blur`; levels 0–1 additionally force opaque glass surfaces and collapse secondary text to full contrast.

TS sources: `src/tokens/{motion,glass}.ts`. Regenerate: `pnpm gen:tokens`.
