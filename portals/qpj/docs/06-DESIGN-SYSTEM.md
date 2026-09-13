# 06 — Design system

QPJ styles **against** `@p31/design-core` (v2.3.0); it does not fork it.

## Load order (matters)

`src/main.tsx` imports in this exact order:

1. `@p31/design-core/css/all.css`   — the system
2. `@p31/design-core/css/container.css`
3. `src/index.css`                  — Lantern layer (warm overrides)

`src/index.css` is the **only** stylesheet for qpj components. It keeps working
against `--p31-*` tokens so a design-core token change propagates; only the hue/zoom
of the family layer is local.

## Token palette (`:root` in index.css, all OKLCH)

`--p31-bg/surface/surface2/border/text/text-secondary/text-tertiary`, `--p31-accent`
(+ `bright/hover/glow/soft/contrast`), `--p31-violet/green/gold/red/star/danger/success/lantern`,
`--p31-touch: 48px`.

- Per-passport accent: `html[data-hue]` (dillpickle 75, breadbutter 235, cornichon 145, gherkin 350, halfsour 285).
- Mode atmosphere: `[data-mode='maker']` deeper ink; `[data-mode='workshop']` +
  `.is-dark` warm dark (`--p31-bg` L≈0.15, surface L≈0.185, text L≈0.92, accent L+5).
- Energy: `--p31-spoon-level` + `data-spoons` (0 calms motion), computed in
  `useModeEffects` onto `html`/`documentElement`.

## Hard rules

- **Zero `#hex`/`rgb()` in src** — enforced in review. OKLCH or tokens only.
  (The APCA checker is the one sanctioned exception: it parses user-entered color
  strings by design — APCA inputs, not palette.) The sandboxed `Studio` (`Studio.tsx`,
  `studio.css`) is held to the same rule: its styles are a 2k-line carve of the chat
  portal's stylesheet, reviewed for token-only colors (the `src` gate verifies no hex
  escapes across the whole tree, including the inherited sandbox sources).
- **Sandboxed studio styles are carved from the chat portal's stylesheet**
  (`chat/src/index.css` → `studio.css`). Where the chat stylesheet carries Tailwind
  utility classes (e.g. `.translate-x-1/2`), they are left as inert no-ops — the build
  emits an esbuild warning but keeps the rules intact.
- **Touch targets ≥ 48px** (`--p31-touch`); focus rings visible; reduced-motion honored
  via `.is-reduced-motion` (drive with `useModeEffects`).
- **Names, not roles**, for people; helper copy is reassurance ("that needs a grown-up"),
  never a wall of text.

The workshop viewers (`src/pages/workshop/workshop.css`) follow the same rules —
token-only, all animation via `p31-rise`/`p31-breathe` keyframes defined locally.