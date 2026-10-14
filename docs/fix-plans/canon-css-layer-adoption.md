<!-- P31-HEADER
id: p31_fix_plan_canon_css_layer_adoption_20261012_v1.0
type: fix-plan
component: portals/mcp-marketplace
status: resolved
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: adopt CSS @layer for portal sheet imports (Gate 3, pre-adoption) — RESOLVED

## Symptom

`node scripts/canon-lint.mjs` (Gate 3, new) FAILED in default mode:

```
✗ [layer] globals.css:1: @import './tokens.css' without layer(...)
```

The token sheet was imported unlayered, so portal rules could win cascade
fights the canon contract never agreed to — the same class of leak that let
`workspace.css` grow the 358–1005px controls (see
`render-gate-baseline-failures.md`).

## Resolution (canon v2 port, 2026-10-12)

The portal now follows the canon v2 wiring (ADR-0001 §4) verbatim:

1. `src/main.tsx` imports, in order:
   - `@p31ca/canon/css/layers.css` — the layer ORDER declaration, FIRST
   - `@p31ca/canon/tokens.css` — the canon tokens (`@layer canon.tokens`)
   - `@p31ca/design-core/css/index.css` — aggregate (bundles canon-v2.css
     plus the legacy design-core recipes the Topbar/Starfield compositions
     still use)
2. `src/globals.css` carries every portal sheet into a declared layer —
   zero unlayered imports:
   - `@import './tokens.css' layer(canon.tokens);` (alias adapters only)
   - `@import './workspace.css' layer(legacy);` (pre-canon surfaces, quarantined)
   - `@import './marketplace.css' layer(legacy);` (quarantined)
   - `@import './shell.css' layer(shell);` (shell-owned geometry only)
   - its own rules (reset, `.btn`, `.glass-panel`, `.badge`) are wrapped in
     `@layer legacy { … }` — the base reset stays available but can never
     beat a canon rule.
3. New `src/shell.css` — the ONLY portal sheet above canon.components. It
   owns geometry exclusively (law 1): the textarea control ceiling
   (`min-height: var(--p31-control-h); max-height: var(--p31-control-h-max)`
   — render-gate A1 ≤64px) and the rebuilt topbar slot widths. No color,
   background, border, radius, shadow, or typography.
4. Faces ship NO `@layer face` CSS — the face layer stays empty.

### Finding filed here: the early-layer-block inversion trap

`src/components/starfield.css` originally wrapped its rule in
`@layer shell { … }`. In the built bundle this sheet can be emitted BEFORE
the layers.css order declaration, and the FIRST `@layer` name in a document
pins that layer's position — so `shell` landed first and the full order
declaration appended the rest after it, silently inverting the contract
(shell BELOW legacy — the textarea cap lost to canon.components, caught by
render-gate at 88px). Rule recorded in the file header: any portal sheet
that can precede the order declaration may only name `legacy` (the first
layer of the declared order), never a later layer. starfield.css now wraps
in `@layer legacy`.

## Verification

- `node scripts/canon-lint.mjs` → **exit 0 without --warn-layer** (no
  unlayered imports; hex still zero outside tokens.css; no legacy selector
  reintroduced in a new sheet). `--self-test` still proves all negative
  controls.
- The layer inversion was verified empirically: after the fix the built
  bundle's first layer-block name is `legacy` and
  `node scripts/render-gate.mjs` → exit 0.