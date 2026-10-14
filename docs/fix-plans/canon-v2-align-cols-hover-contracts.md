<!-- P31-HEADER
id: p31_fix_plan_canon_v2_align_cols_hover_contracts_20261012_v1.0
type: fix-plan
component: packages/design-core
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: canon v2 alignment / grid-recipes / hover contracts (POSITIONING items 3–5)

**Discovered by:** agent:subagent:canon-v2 (H2b hub-density leg — the three
locked voids in `apps/p31ca/docs/STRATEGIC-POSITIONING.md` §Voids → actions,
items 3/4/5)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (design-frame voids — hero alignment, uneven card rows,
underline-on-hover; all three had no canon v2 contract to compose against)

## The gaps

1. **Title alignment (item 3).** `[data-p31="page-header"]` had no
   `data-align` variant — a centered hero could only be faked with
   per-surface margin hacks (the doubled-margin bug class, ADR §11).
2. **Uneven card grids (item 4).** `[data-p31="grid"]` only had the
   auto-fill `data-min` recipe — no explicit column counts, no equal-height
   rows, so card footers ragged by content height.
3. **Underline-on-hover (item 5).** No canon contract for card hover
   (lift + accent border), CTA arrow shift, or the standalone-link
   underline-draw; surfaces forked their own hover treatments.

## The fix — additive, attribute-scoped, layered

All rules added inside the existing layers of
`packages/design-core/src/css/canon-v2.css`. No existing selector or rule
was modified; no file was deleted; token gates, canon-lint and the design
frame stay green (evidence below).

### 1. Page-header alignment — `@layer canon.layout`

| Selector | File:line | Rule |
|---|---|---|
| `[data-p31="page-header"][data-align="center"]` | canon-v2.css:194 | flex column; align-items center; text-align center |
| `[data-p31="page-header"][data-align="center"] [data-p31="page-header-subtitle"]` | canon-v2.css:199 | `max-width: var(--p31-prose-max); margin-inline: auto` |
| `[data-p31="page-header"][data-align="start"]` | canon-v2.css:205 | `text-align: left` (documented default) |

Only the header block centers — body prose never does (design frame).

### 2. Explicit grid recipes — `@layer canon.layout`

| Selector | File:line | Rule |
|---|---|---|
| `[data-p31="grid"][data-cols="4"]` | canon-v2.css:245 | `repeat(4, minmax(0, 1fr))` |
| `[data-p31="grid"][data-cols="2"]` | canon-v2.css:246 | `repeat(2, minmax(0, 1fr))` |
| `[data-p31="grid"][data-cols="1"]` | canon-v2.css:247 | `minmax(0, 1fr)` |
| `[data-p31="grid"][data-even]` | canon-v2.css:251 | `grid-auto-rows: 1fr; align-items: stretch` |
| `[data-p31="grid"][data-even] > *` | canon-v2.css:255 | flex column, `height: 100%` |
| `[data-p31="grid"][data-even] > * > :last-child` | canon-v2.css:260 | `margin-top: auto` (footer pin) |
| `@media (max-width: 56.24rem)` (`data-cols="4"`) | canon-v2.css:265–267 | 4 → 2 at ≤900px |
| `@media (max-width: 34.99rem)` (any `data-cols`) | canon-v2.css:268–273 | any count → 1 at ≤560px |

### 3. Hover contract — `@layer canon.components`

| Selector | File:line | Rule |
|---|---|---|
| `[data-p31="card"]` | canon-v2.css:649 | transition transform + border-color (fast/easing tokens) |
| `[data-p31="card"]:hover` | canon-v2.css:654 | `translateY(-2px)`; border-color accent mix (`color-mix(in oklch, var(--p31-accent) 45%, var(--p31-glass-border))`) |
| `[data-p31="card"] a`, `[data-p31="card"] [data-p31="card-cta"]` | canon-v2.css:658–659 | `text-decoration: none` |
| `[data-p31="card-cta"]` | canon-v2.css:662 | transition color |
| `[data-p31="card-cta-arrow"]` | canon-v2.css:665 | transition transform |
| `[data-p31="card"]:hover [data-p31="card-cta"]`, `[data-p31="card-cta"]:focus-visible` | canon-v2.css:670–671 | `color: var(--p31-accent-hover)` (keyboard parity) |
| `[data-p31="card"]:hover [data-p31="card-cta-arrow"]`, `[data-p31="card-cta"]:focus-visible [data-p31="card-cta-arrow"]` | canon-v2.css:674–675 | `translateX(2px)` |
| `[data-p31="link-standalone"]` | canon-v2.css:680 | `display: inline-block; text-decoration: none` |
| `[data-p31="link-standalone"]::after` | canon-v2.css:684 | underline draw: 1px currentColor, `scaleX(0)`, origin left, transition transform |
| `:hover::after` / `:focus-visible::after` | canon-v2.css:693–694 | `scaleX(1)` |
| `@media (prefers-reduced-motion: reduce)` | canon-v2.css:698–705 | transitions off (feedback instant, never animated) |

Inline prose links stay `text-decoration: underline` (WCAG 1.4.1) — owned by
prose styles, explicitly NOT part of this contract (documented in ADR §16).
No bold/scale/rotation/background on text hover: only the card lifts, the
arrow shifts, the underline slides.

## Findings filed (owned by other legs — out of scope here)

- **`--p31-accent-hover` is CSS-only.** It resolves from
  `@p31ca/canon/css/quantum.css` (`packages/canon/dist/css/quantum.css:104`),
  is consumed by `packages/canon/src/css/suite.css:79`, but is absent from
  `tokens.dtc.json` (the parity gate's CSS-only/non-portable bucket).
  Promoting it into the DTCG export is a canon-token leg — `packages/canon`
  is owned by the parallel hub agent, so this leg consumes the CSS export
  and files the gap here.

## Verification

- `node scripts/check-token-vocabulary.mjs` → ✅ green (no old token paths)
- `node scripts/check-token-parity.mjs` → ✅ green (243 DTCG ↔ CSS; CSS-only
  bucket unchanged by this leg)
- `node scripts/canon-lint.mjs` → ✅ green (default portal scan untouched)
- `node scripts/canon-lint.mjs --path packages/design-core/src/css` → ✅
  green (new selectors carry no hex, no unlayered imports, no legacy classes)
- `npx tsc --noEmit` in `packages/design-core` → ✅ green
- `vitest run` in `packages/design-core` → ✅ green (canon-v2.spec.tsx etc.)
- `node scripts/fix-plan-scan.mjs` → ⚠ two PRE-EXISTING ownership failures
  (`wave-8-collab-harness`, `wave-8-room-hibernation` — open ≥7 days,
  component: shell, owned by another workstream, untouched by this leg).
  This plan is `status: resolved` and adds zero violations.

## Resolution (2026-10-12)

- Added the three contracts to `packages/design-core/src/css/canon-v2.css`
  (additive; lines in the tables above). No pre-existing selector/rule
  touched; no deletions.
- Documented the contracts in
  `docs/enterprise/design-system/canon-v2.md` §14 (alignment), §15 (grid
  recipes), §16 (hover contract) with the prose-link boundary and the
  reduced-motion rule.
- Gate evidence above; the two token gates, canon-lint (both scopes), tsc,
  and design-core tests are green. fix-plan-scan's only failures are the two
  pre-existing open wave-8 plans (recorded here, out of scope).