# LAYOUT.md — the card contract (WP-2026-09-27)

These rules are enforced by `surface.css` + `src/lib/surface.tsx` and verified by
`tests/visual.spec.ts`. Every change must keep them.

## The four-slot card
Every grid card renders through `SurfaceCard` (`src/lib/surface.tsx`) with
exactly four slots:

| Slot | Row | Content |
|------|-----|---------|
| `head` | 1 | icon, badge, title |
| `body` | 2 | description / preview |
| `meta` | 3 | tags, import path, metadata |
| `foot` | 4 | actions — aligns to the bottom |

The parent grid declares the shared row tracks (`auto auto 1fr auto`); the card
inherits them via CSS subgrid (`grid-template-rows: subgrid; grid-row: span 4`),
so the tallest head sizes the head track for **every** card in the row.

## Non-negotiables
1. **No class name ends in `-body`.** The CSS bundler merges classes ending in
   `body` into the bare `body` element selector and clobbers the layout. Use
   `__content`.
2. **Never a bare `1fr` column** — always `minmax(0, 1fr)`.
3. **`min-width: 0; min-height: 0` on every grid child** — the anti-blowout rule.
4. **No padding on the subgrid container** — padding lives on the slots.
5. **No glass-on-glass** (no `.glass-tile` inside a `.glass-tile`).
6. **OKLCH + `color-mix()` only** — no raw hex, no `rgba()`.
7. Every text node declares its overflow: title `line-clamp: 2`, body
   `line-clamp: 3`, meta ellipsis.

## Tile grids
Non-card uniform grids (icons, tokens, chips) use `SurfaceGrid
className="surface-grid--tiles"` — same columns, plain auto rows, no 4-track
contract.

## Fallback
`@supports not (grid-template-rows: subgrid)` → the card becomes flex-column;
only the footer aligns (`margin-top: auto`). Graceful, never an error.

## The visual gate
`tests/visual.spec.ts` screenshots all 13 surfaces at 1440/820/480 and diffs
against `tests/visual.spec.ts-snapshots/` (Linux/chromium canonical). It blocks
`build:pwa` on >1% pixel drift. Regenerate intentionally:
`npx playwright test --update-snapshots` (then review the diff).