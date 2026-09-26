# COMPONENTS.md — component API contracts (WP-2026-09-27)

Every shared component in `src/lib/` + the vendored ambient declares a stable
API. The prop list IS the contract — changing it is a breaking change.

## SurfaceLayout
`{ children }` — the max-width 960px / gutter 32px scroll container every
surface mounts. Do not add per-page margins here.

## SurfaceHero
`{ eyebrow?, title, lede?, actions? }` — the header card. `title` is the h1
(surfaces carry exactly one h1). `actions` are the hero's buttons/links.

## SurfaceSection
`{ title?, children }` — 64px vertical rhythm. `title` renders an h3.

## SurfaceGrid
`{ columns = 2, className?, children }` — the card grid. `columns` sets
`--surface-grid-cols`. Add `className="surface-grid--tiles"` for tile/uniform
grids (icons, swatches, chips) that are NOT four-slot cards.

## SurfaceCard
```ts
SurfaceCard({ head: ReactNode, body?: ReactNode, meta?: ReactNode,
              foot?: ReactNode, bare?: boolean, className?: string })
```
- `head` required (row 1); `body`/`meta`/`foot` optional (rows 2–4).
- `bare` — full-bleed escape hatch (skips the four-slot subgrid).
- Exactly four slots; a fifth child passed directly is a type error.

## Data-contract (every surface root)
Each surface root carries `data-mcp-tool="<name>Surface"` +
`data-mcp-state="ready"` for agent navigation (see `src/lib/mcpTools.ts`).

## Tokens
Three tiers only (see `src/tokens.css` + `scripts/token-tier-audit.mjs`):
primitive (literal oklch/px/rem) → semantic (aliases) → component (scoped,
must reference semantic, never primitive). `--p31-*` only — no raw color
literals in surfaces (enforced by `token-audit`).

## Ambient
The dome/blob/starfield + LED controller are vendored from
`@p31/p31ca-ambient` — never edited in place; changes go through
`node scripts/sync-p31ca-ambient.mjs`.