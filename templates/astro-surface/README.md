<!-- P31-HEADER
id: p31_template_astro_surface_20261013_v1.0
type: template
component: templates/astro-surface
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# astro-surface — blueprint for a canon-wired Astro surface

NOT a runnable package. This is a scaffold blueprint for how every Astro
surface (p31ca pages, phosphorus31 pages, future sites) consumes the
canon-astro wrapper once Phase 2 ships it. Copy the SHAPE, not the files.

## The shape

```
astro-surface/
├── package.json        # deps the surface declares (blueprint values only)
├── astro.config.mjs    # static output + the one global CSS import
├── site-config.ts      # site-level config: title, nav, theme, page-max
└── src/
    └── pages/
        └── about.astro # a page obeying all four PAGE-CONTRACTS
```

## The three rules this scaffold exists to teach

1. **The surface imports ONE stylesheet** — the canon-astro wrapper
   (`@p31ca/canon-astro-style/index.css`). No page-local `<style>` with
   layout/color rules (PAGE-CONTRACTS G4, B-rules).
2. **The shell owns the container** — `[data-p31="page"]` centers itself
   at `--p31-page-max` (80rem) with `margin-inline:auto`. Pages add
   content, never width (C1–C4).
3. **One header chain, start-aligned** unless the page is on the
   reference center list (H1–H4).

## Wiring order (canon-v2 §4, adapted for Astro)

`astro.config.mjs` or the layout imports, in this order:
1. `@p31ca/canon/css/layers.css` (layer order first — first declaration wins)
2. `@p31ca/canon/css/tokens.css`
3. `@p31ca/canon-astro-style/index.css` (Phase 2 wrapper: page/header/grid recipes)

The wrapper carries the PAGE-CONTRACTS utilities; the surface never copies
`data-cols`/`data-even` recipes into its own CSS.

## Migration note

This scaffold is the end state of `../page-migration.md`. A migrated p31ca
page should diff against this shape: one import, one `data-p31="page"`,
one header chain, `data-p31="grid"` grids, no badges.