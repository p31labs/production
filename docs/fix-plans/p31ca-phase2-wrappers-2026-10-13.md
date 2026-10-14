<!-- P31-HEADER
id: p31ca_phase2_wrappers_20261013_v1.0
type: fix-plan
component: packages/canon-parts
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# Phase 2 — Wrapper Libraries (canon-parts / canon-astro / canon-react)

Issue: Phase 1 delivered one token core; Phase 2 ships the two thin world
wrappers (Astro static + React portals) over a shared class-recipe core, so
each surface imports only its world's wrapper and both worlds render the
same HTML for the same props (parallel-paths-enterprise-runbook.md §2–4).

## ROLLBACK CONDITIONS (written before the first edit)

1. **RC1 — parity red.** If `node packages/canon-parts/scripts/parity.mjs`
   (same-HTML parity test) reports any matrix cell where canon-astro and
   canon-react HTML strings differ: fix the wrapper pair in this phase; if
   the fix requires touching packages/canon (Phase 1) or design-core
   non-additively, REVERT the wrapper change and file — never paper over
   with a test carve-out.
2. **RC2 — no hardcoded values.** If the drift detector
   (`/home/p31/production/scripts/token-drift-check.mjs`) reports raw
   oklch/hex literals or `--p31-*` re-declarations inside the three new
   packages (canon-parts must be 100% token-composed; the wrappers may
   only reference canon-parts classes + data-p31 attributes): fix the
   violating recipe. Unfixable ⇒ revert that package's files.
3. **RC3 — build/import break.** If `canon-react` or `canon-astro` fail
   to build/typecheck or their import graph resolves to anything outside
   `@p31ca/canon`, `@p31ca/canon-parts`, react 19, or astro 5+: revert
   the offending file set. The wrappers must never import app/portal
   code.
4. **RC4 — wrapper divergence from canon-v2 contract.** canon-react and
   canon-astro must keep the SAME names, prop shapes, and `data-p31`
   attribute markup as `packages/design-core/src/compositions/canon-v2/*`
   (the seed). A deliberate prop/name change without owner ratification
   ⇒ revert. Additive props (className passthrough) are allowed.
5. **RC5 — scope creep into surfaces.** Any accidental edit to
   `apps/**`, `portals/**`, `workers/**`, or design-core non-additive
   files ⇒ revert that edit immediately (HARD RULE 2).

## 1. Seed inventory (what exists today)

`packages/design-core/src/compositions/canon-v2/` — 21 React components,
thin `data-p31` attribute wrappers, zero CSS of their own (styles in
`@p31ca/design-core/css/canon-v2.css`): Shell, Page (+PagePanel), PageHeader
(+PageHeaderV2), Stack, Grid, Split, Field, Input, Textarea, Select, Tabs,
Menu, Dialog, Sheet, EmptyState, ErrorState, Skeleton (+SkeletonBar),
ListingShell, DetailShell, Wizard.

## 2. New packages (this phase)

1. `packages/canon-parts/` — the shared class-recipe core:
   `src/recipes.css` (@layer canon.components: .p31-btn variants,
   .p31-card, .p31-badge, .p31-field, .p31-page-header, .p31-grid
   helpers — every value via `var(--p31-*)` only, zero literals) +
   `src/recipes.mjs` (class-string builders shared by BOTH wrappers).
   Depends on `@p31ca/canon` (tokens only).
2. `packages/canon-astro/` — server-only .astro components, full
   canon-v2 set, same names + semantic props; `class` + named `<slot/>`
   slots.
3. `packages/canon-react/` — React 19, full canon-v2 set, same names +
   semantic props; `className` + ReactNode slot props.
4. `packages/canon-parts/scripts/parity.mjs` — renders a representative
   prop matrix through BOTH wrappers and asserts identical HTML strings.
   React side: `react-dom/server` renderToStaticMarkup (react 19.3.0 in
   store). Astro side: `astro/container` renderToString (astro 5.18.2 /
   6.4.8 in store).

## 3. Evidence to collect

- Parity test exit 0 across the full matrix.
- Both wrapper packages typecheck/build; canon-parts CSS drift-free.
- Package structure + component/prop inventory in this file's §4.

## 4. Phase 3 handoff notes

- Surface adoption order for Track B: p31ca pages in page-audit.md order
  (containers → headers → grids → badges), each running the
  PAGE-CONTRACTS.md greps; Track C: portal legacy quarantine then
  face-by-face port to these wrappers.
- Deprecation timeline: `--p31-topbar-height` alias + legacy 61px +
  design-core legacy CSS removed at port time (Phase 4 deletion leg,
  owner-approved).
- phosphorus31 (D5): wire HomeView/TransparencyView as real pages under
  BaseLayout + canon-astro, port the Tailwind hex palette to token
  aliases (Phase 3).

## 5. RESOLUTION — 2026-10-14 (resume session, lane completed)

### Rollback-condition audit (all honored, none fired)

- **RC1 — parity red: NO.** `packages/canon-parts/scripts/parity.mjs`
  renders a 49-cell matrix through BOTH wrappers and asserts identical
  HTML strings — **49/49 byte-identical**, exit 0 (also via
  `pnpm --filter @p31ca/canon-parts parity`). One mismatch was found and
  FIXED during the build (Input rest-prop key order): the React wrapper
  now normalizes spread-rest keys via `orderedRest()` to the same
  canonical order the Astro wrapper declares — a wrapper-pair fix, no
  test carve-out, no design-core/canon edits.
- **RC2 — no hardcoded values: CLEAN.** `scripts/token-drift-check.mjs`
  over the three packages: 57 files, 0 `--p31-*` re-declarations, 0 raw
  color literals. canon-parts recipes.css is 100% `var(--p31-*)`;
  wrappers emit only canon-parts classes + data-p31 attributes.
- **RC3 — build/import break: NO.** canon-react `tsc` build + typecheck
  exit 0 (React 19.3, no app/portal imports — imports are only
  `@p31ca/canon-parts` + react). canon-astro `astro sync` + `tsc
  --noEmit` exit 0 (astro 6.4.8; imports only `@p31ca/canon-parts`).
- **RC4 — wrapper divergence from canon-v2 contract: NONE in names,
  props, or data-p31 markup.** All 23 seed names shipped in both worlds
  (Shell, Page, PagePanel, PageHeader, PageHeaderV2, Stack, Grid, Split,
  Field, Input, Textarea, Select, Tabs, Menu, Dialog, Sheet, EmptyState,
  ErrorState, Skeleton, SkeletonBar, ListingShell, DetailShell, Wizard)
  with the seed's prop shapes; data-p31 attribute markup is generated
  from ONE shared tree (canon-parts markup.mjs), so divergence is
  structurally impossible — the parity gate proves the plumbing.
  Documented deviations (all additive or unavoidable for parity):
  (1) deterministic default control ids (`p31-input` etc. — the seed's
  React `useId` suffix is render-order dependent and cannot match a
  static Astro render); (2) Wizard actions compose the `.p31-btn`
  recipe instead of the seed's legacy design-core Button classes (that
  is the Phase 2 mandate); (3) `className` passthrough allowed per RC4.
- **RC5 — scope creep: NONE.** No edits under apps/**, portals/**,
  workers/**; design-core untouched this phase. HARD RULE 2 held.

### Architecture (as shipped)

- **`packages/canon-parts/`** — shared class-recipe core:
  `src/recipes.css` (@layer canon.components: .p31-btn + data-variant/
  data-size, .p31-card, .p31-badge + data-tone, .p31-field,
  .p31-page-header, .p31-grid + data-min — every value a var(--p31-*));
  `src/recipes.mjs` (class/data builders shared by BOTH wrappers);
  `src/markup.mjs` — the addition that makes parity structural: the ONE
  markup tree for the full canon-v2 set + `renderHtml()`, a serializer
  that emulates react-dom/server renderToStaticMarkup byte-for-byte
  (react-dom@19.3.0 server renderer rules: input/button form-action
  capture+reorder, boolean attrs as `name=""`|omitted, `class=""`
  kept, void `<input/>` self-close, React escaping incl. `&#x27;`,
  style-object hyphenation with React's unitless list). DevDeps (parity
  only): astro, react, react-dom, vite.
- **`packages/canon-astro/`** — server-only .astro, one file per
  component; frontmatter renders the shared tree via `set:html`;
  content props are named slots captured with `Astro.slots.render()`
  (verified caller-driven — works with no `<slot/>` tags in the
  template, astro 6 runtime); text props are plain props.
- **`packages/canon-react/`** — React 19 (createElement, no JSX);
  `reactTree.ts` converts the shared trees to real React elements,
  `{ passthrough }` children carry ReactNode slot props, `__handlers`
  wire the interactive set (Split pointer/keyboard, Tabs/Menu onSelect,
  Dialog/Sheet escape+focus, Wizard onBack/onNext/onFinish) without
  touching serialized HTML. tsc-built to dist/ + .d.ts.

### Evidence

- Parity: 49/49 cells byte-identical, exit 0 (cells cover every
  component + variants: Page×4 modes, Stack×3, Grid×3, Split×4,
  Field×2, Input×3, Tabs×2, Menu×2, Dialog×3, Sheet×2, Skeleton×2,
  SkeletonBar×2, ListingShell×3, Wizard×2, …).
- Builds: canon-react build exit 0; canon-astro typecheck exit 0;
  canon-parts build (recipes.css copy) exit 0.
- Drift: 0 findings across the three packages (RC2).
- Dependency import graph (RC3): canon-astro → @p31ca/canon-parts →
  @p31ca/canon only; canon-react → @p31ca/canon-parts only; parity
  devDeps are the sole react/react-dom/astro/vite usage.
- No live-surface deploys; no edits to STATE.md/INBOX.md/AGENTS.md/
  AGENT-RUNBOOK*; byte-caps honored throughout.

### Phase 3 handoff (append to §4)

- The drift baseline (`scripts/token-drift-check.mjs --no-fail
  apps/p31ca`, 2026-10-14) counted **613 re-declarations + 2660 raw
  color literals** — that ledger IS the port queue; biggest clusters:
  `apps/p31ca/public/lib/p31-fluid.css` (full local palette),
  `apps/p31ca/public/delta-hiring/assets/*.css` (built fork),
  `apps/p31ca/archive/AppShell.spike-v1.astro`,
  `apps/p31ca/src/styles/global.css` rose override (now a
  `[data-theme="rose"]` mode in canon — the surface should SWAP the
  theme attribute instead of re-declaring).
- Parity gate wiring: promote `canon-parts parity` into `pnpm gate` at
  Phase 5 (runbook §4); today it runs on demand + in this lane's CI
  evidence only — NOT wired (per HARD RULE "do NOT wire into pnpm
  gate").
- Wrapper adoption order unchanged from §4; smoke pages must import
  `@p31ca/canon/tokens.css` → `@p31ca/canon/css/layers.css` →
  `@p31ca/canon-parts/recipes.css` once per surface.