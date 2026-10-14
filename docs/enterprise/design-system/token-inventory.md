<!-- P31-HEADER
id: p31_token_inventory_20261013_v1.0
type: research
component: docs/enterprise/design-system
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# Token-Source Inventory — estate-wide (Phase 0, read-only audit)

Phase 0 deliverable 1 for the design-system unification. Enumerates every
token-definition source, its consumers, and — the raw material for the §1
token-unification track — the **drift table**: token NAMES that exist in
multiple sources with DIFFERENT values.

Companion docs (existing, not superseded): `token-architecture.md`
(three-tier model + DTCG governance), `design-core-inventory.md` (design-core
duplication ledger), `token-vocabulary-inventory.md` (yml ↔ p31 gap).
This file is the estate map; those files are the per-package ledgers.

## 1. Source register

| # | Source | Path | Format | Size / count | Consumers | Last-modified |
|---|--------|------|--------|--------------|-----------|---------------|
| S1 | Universal canon (SSOT) | `software/design-tokens/p31-universal-canon.json` | JSON (p31 schema 2.0) — hex palette + fonts + radii | 4.3 KB | `@p31ca/design-core` v2 (per `token-architecture.md`) | 2026-09-29 |
| S2 | Canon DTCG export | `packages/canon/tokens/tokens.dtc.json` | DTCG JSON (`$value`/`$type`) | 185 KB, **661 tokens** + `themes.*` | generated (from S3) → `dtokens` validation; consumed by packages | 2026-10-12 17:52 |
| S3 | Canon resolved JSON | `packages/canon/tokens/dist/tokens.resolved.json` | JSON (resolved aliases) | 74 KB | build artifact of S2 | 2026-10-12 |
| S4 | Canon CSS export (generated) | `packages/canon/dist/tokens.css` + `dist/css/quantum.css` | CSS custom properties (`--p31-*`) | 106.5 KB dist; quantum.css 97 defs | `@p31ca/canon/tokens.css` → p31ca (`global.css`), shell, portals/shell, mcp-marketplace, signin/signup, MarketingShell | 2026-10-12 |
| S5 | Canon theme store | `packages/canon/src/theming/theme-store.ts` | TS `BASE` record — `p31.*` paths (incl. `page-max`, `header-height`, `control-h`) | 50.7 KB | `gen-tokens.mjs` → S2/S4 | 2026-10-12 17:47 |
| S6 | Canon registry | `packages/canon/registry.json` | JSON registry | 118 KB — 252 tokens, 32 components, 133 CSS classes, 11 themes | gate / validation | 2026-10-09 |
| S7 | Design-core token TS | `packages/design-core/src/tokens/{color,glass,motion,typography}.ts` | TS ramps (`colorRamps` oklch arrays) | 3.2 KB color.ts | `gen-tokens.mts` → generated CSS | 2026-09-24 (color) |
| S8 | Design-core semantic manifest | `packages/design-core/src/css/semantic-token-manifest.json` | JSON manifest | 29 KB | design-core css pipeline | 2026-09-29 |
| S9 | Design-core legacy CSS | `packages/design-core/src/css/canon.css` (93 defs), `quantum.css` (33), `recipes.css` (5) | CSS (unlayered pre-canon) | canon.css is the legacy default | portals (children/parent/teen/design/meatspace/chat/qpj/workspace/mcp-marketplace/env-portal/forge/ui-forge-studio), shell, apps (willow/phos/bonding/arcade/tetra-ops/_template/bash/growth-dashboard/phosphorus31) | 2026-09-19 |
| S10 | Design-core theme personas | `packages/design-core/src/css/theme-p31ca.css` (9 defs), `theme-phosphorus31.css` (22 defs) | CSS persona overrides (`[data-theme='rebel'/'caretaker']`) | REBEL=cyan, CARETAKER=emerald | design-core `all.css` importers | 2026-09-19 |
| S11 | Portal design tokens | `portals/design/src/tokens.css` | CSS — hue-270 neutrals, own concrete values | 5.5 KB, 81 defs | `portals/design/src/main.tsx` (only) | 2026-09-26 |
| S12 | Marketplace token adapters | `portals/mcp-marketplace/src/tokens.css` | CSS — aliases to canon names only | 1.8 KB, 23 defs | `portals/mcp-marketplace/src/main.tsx` | 2026-10-11 |
| S13 | Shell chrome tokens | `shell/src/index.css` (+ `portals/shell/src/index.css`) | CSS — legacy dc-canon values | 134.9 KB, 104 `--p31-*` defs (61px + 56px header both present) | shell app | 2026-10-13 |
| S14 | p31ca global tokens | `apps/p31ca/src/styles/global.css` | CSS `:root` overrides (after `@p31ca/canon/tokens.css`) | 2.7 KB, 27 defs | every p31ca page via MarketingShell | 2026-10-12 |
| S15 | p31ca Tailwind v4 theme | `apps/p31ca/tailwind.build.css` | Tailwind `@theme` — hex hub/brand palette (hubRose `#e8636f`, hubNav `#080810`) | CSS-first v4 entry | `global.css` imports it | 2026-10-12 |
| S16 | p31ca local canon mirror | `apps/p31ca/src/styles/p31-style.css` + `topbar.css` | CSS — local copy of `data-cols`/`data-even` recipes + topbar | 12.3 KB + 7.8 KB | p31ca pages | 2026-10-13 |
| S17 | p31ca retired Tailwind config | `apps/p31ca/tailwind.config.mjs` | Tailwind v3 config — **superseded, empty export** | 0 effective tokens | none (dead, kept per no-delete) | 2026-10-12 |
| S18 | phosphorus31 Tailwind theme | `apps/phosphorus31/tailwind.config.mjs` | Tailwind v3 config — hex palette (`void #030305`, `quantum.violet #b53cff`…) | 1.7 KB | `src/styles/global.css` via `@config` | 2026-09-17 |
| S19 | phosphorus31 style layers | `apps/phosphorus31/src/styles/global.css` (0 `--p31-*` defs — only aliases `--color-void: var(--p31-bg)`) + `overrides.css` | Tailwind v4 `@theme` aliases to design-core vars | 4.8 KB + 5.9 KB | BaseLayout/Layout (which no page uses — see page-audit) | 2026-09-29 |
| S20 | Token workflow fixtures | `design-workflow/A-token-pipeline/{supplement,breakpoints}.tokens.json`, `design-workflow/V5-A-canon-sandbox/gate-sources/*` | DTCG JSON fixtures (pipeline test data) | small | token-validation CI gates | — |

Format census: **1 JSON SSOT (S1) · 2 DTCG JSON (S2, S20) · 1 resolved JSON (S3) ·
9 CSS sources with concrete values (S4, S9, S10, S11, S13, S14, S16) ·
1 CSS alias-only adapter (S12) · 2 Tailwind configs (S15/S18) ·
2 TS token stores (S5, S7) · 2 registries (S6, S8).**

## 2. Drift table — same NAME, different VALUES

Extracted 2026-10-13 by grepping `--p31-*` definitions per source and diffing
values. `dc-canon` = `packages/design-core/src/css/canon.css` (legacy default);
`canon-quantum` = `packages/canon/src/css/quantum.css` (generated SSOT export);
`p31ca-global` = `apps/p31ca/src/styles/global.css`; `shell` =
`shell/src/index.css`; `theme-p31ca/phos31` = design-core personas;
`portal-design` = `portals/design/src/tokens.css`; `portal-mcp` = adapters.

| Token | Sources + values |
|---|---|
| `--p31-accent` | canon-quantum: `var(--p31-accent-cyan)` (cyan) · dc-canon/shell/p31ca-global: `oklch(65% 0.14 45)` (**rose**) · theme-p31ca: `oklch(65% 0.28 195)` (cyan) · theme-phos31: `oklch(50% 0.18 150)` (emerald) — **4 values, 3 hue families** |
| `--p31-accent-hover` | canon-quantum/portal-design: concrete `oklch(0.84 0.16 195)` · portal-mcp: `var(--p31-accent-bright)` alias — concrete vs alias |
| `--p31-accent-violet` | portal-design: `oklch(0.72 0.16 285)` · p31ca-global: `oklch(60% 0.1 28)` (**hue 28 = orange**, not violet) · DTCG `p31.color.accent.violet.default`: hue 250 |
| `--p31-bg` | dc-canon: `oklch(14% 0.014 270)` · p31ca-global/shell: `oklch(14% 0.014 75)` (same L/C, **hue 270→75**) · theme-p31ca: `oklch(8% 0.01 270)` · theme-phos31: `oklch(98% 0.008 270)` (light) |
| `--p31-surface` | canon-quantum/portal-design: `oklch(0.14 0.008 270)` · dc-canon/p31ca-global/shell: `oklch(19% 0.017 270/74)` · theme-p31ca: 12% · theme-phos31: 95% |
| `--p31-surface3` | canon-quantum/portal-design: concrete `oklch(0.28 0.015 270)` · portal-mcp: `var(--p31-surface-overlay)` alias |
| `--p31-text` | dc-canon/p31ca/shell: `oklch(93% 0.012 270/80)` · theme-p31ca: `oklch(97% …)` · theme-phos31: `oklch(15% …)` · DTCG `p31.text`: `oklch(96% 0.005 270)` |
| `--p31-radius-sm` | canon-quantum/portal-design: **8px** · dc-canon/shell/p31ca-global: **2px** · theme-phos31: **6px** · DTCG `p31.radius.sm`: **8px** |
| `--p31-radius-md` | canon-quantum/portal-design: **12px** · dc-canon/shell/p31ca-global: **4px** · theme-phos31: **4px** · DTCG: **16px** — 3 scales |
| `--p31-radius-lg` | canon-quantum/portal-design: **24px** · dc-canon/shell/p31ca-global: **8px** · DTCG: **24px** |
| `--p31-glass-bg` | canon-quantum/portal-design: `color-mix(white 4%)` · dc-canon/shell/p31ca: `oklch(100% 0.01 75 / 0.10)` — mechanism differs |
| `--p31-glass-border` | canon-quantum/portal-design: `color-mix(white 8%)` · dc-canon/shell/p31ca: `oklch(100% … / 0.16)` · theme-p31ca: `/ 0.08` · theme-phos31: `/ 0.15` |
| `--p31-font-sans` | canon-quantum/portal-design: **Inter** · dc-canon/shell/p31ca-global: **Plus Jakarta Sans** · DTCG `p31.font-sans`: **Space Grotesk** · phosphorus31: **JetBrains Mono** family |
| `--p31-header-height` | canon-v2 contract + MarketingShell + DTCG: **4rem** · shell legacy (unlayered): **61px** · `--p31-topbar-height`: **56px** (p31ca/shell/dc-canon) — two names, three values |
| `--p31-space-*` | portal-design: 4/8/12/16/24/32/48px · portal-mcp: aliases (`space-1`→`space-micro`) · DTCG: `space-2`=8px, `space-5`=32px, `space-6`=24px — **DTCG `space-5`/`space-6` swapped vs portal-design scale** |
| `--p31-star` | portal-design: concrete `oklch(0.8 0.125 90)` · portal-mcp: `var(--p31-neon-amber)` |
| `--p31-scrim` | portal-design: concrete gradient · portal-mcp: identical copy (duplicated, not aliased) |

## 3. Headline findings — top 5 token collisions

1. **`--p31-accent` carries four identities.** The canon SSOT export is
   cyan (`var(--p31-accent-cyan)`, theme cipher); the live p31ca site overrides
   it to rose (`oklch(65% 0.14 45)`, `apps/p31ca/src/styles/global.css:7`) —
   the same value dc-canon legacy and the shell carry. `theme-p31ca.css`
   claims the same name for cyan, `theme-phosphorus31.css` for emerald.
   Every surface importing a different layer shows a different brand color.
2. **The radius scale is three forks.** 8/12/24 (canon, portal-design),
   2/4/8 (dc-canon legacy + shell + p31ca-global override), 6/4/8
   (caretaker persona), plus the DTCG export's own 8/16/24. Buttons on
   p31ca render 2px while the DTCG source says 8px.
3. **Neutral hue war: 270 vs 75.** The canon hue-270 neutrals (void
   `oklch(0.08 0.005 270)`) survive in portal-design, but dc-canon, the
   shell, and p31ca's global override shifted `bg`/`surface`/`text` to
   hue 74–80 — a warm amber cast under the same names.
4. **Header height has three names/values.** `--p31-header-height: 4rem`
   (canon-v2 contract, MarketingShell, DTCG), legacy `61px` (shell
   `src/index.css`, unlayered — filed
   `canon-v2-header-height-legacy-drift.md`), and `--p31-topbar-height: 56px`
   (p31ca `global.css:24`, dc-canon, shell). Scroll-padding follows 4rem;
   the 61px rule still lands in the shell cascade.
5. **The font stack is four families.** Inter (canon CSS export +
   portal-design), Plus Jakarta Sans (dc-canon/shell/p31ca), Space Grotesk
   (DTCG `p31.font-sans`), JetBrains Mono-as-body (phosphorus31 Tailwind
   theme). The DTCG export and the CSS export of the same package disagree
   with each other.

Secondary: `--p31-accent-violet` is orange (hue 28) in p31ca's override;
`--p31-space-5/6` order differs between the portal scale and DTCG;
mcp-marketplace's adapter file is the *correct* pattern (aliases only, zero
invented values — `canon-source-audit` R1 safe) while portal-design's
`tokens.css` invents concrete values that shadow the same names.

## 4. Notes for the §1 unification track

- S1 claims to be SSOT but S2 (DTCG) is generated from S5 (theme-store.ts),
  not from S1 — `token-architecture.md` §"Canonical source" vs the actual
  `gen:tokens` pipeline disagree. Resolve which file owns `p31.*` before any
  value merge.
- S9/S13/S14 (dc-canon legacy, shell, p31ca override) share one value set
  (rose accent, warm neutrals, 2/4/8 radius, Jakarta Sans). They are one
  fork, ported three times — collapse them to one `@layer legacy` quarantine
  (canon-v2 ADR §5 step 2) and delete face-by-face.
- S15/S18 hex palettes (Tailwind `@theme`) are a fifth copy of the brand
  colors (hex, not oklch). p31ca's `hubRose #e8636f` ≈ the rose accent fork;
  phosphorus31's `quantum.violet #b53cff` matches nothing in oklch sources.
- S20 fixtures are CI test data, not a live source — exclude from the merge.