<!-- P31-HEADER
id: p31ca_phase3_batch1_20261014_v1.0
type: fix-plan
component: apps/p31ca
status: live
retention: keep-forever
created: 2026-10-14T00:00:00Z
owner: will
-->

# Phase 3 Batch 1 — design-system adoption (about / team / faq / enterprise / research)

Adopts the five Batch 1 hub pages onto the canon token core + canon-astro
wrapper (imports: `@p31ca/canon/tokens.css` → `@p31ca/canon/css/layers.css` →
`@p31ca/canon-parts/recipes.css`, plus `@p31ca/design-core/css/canon-v2.css`
for the attribute-scoped component CSS), ships `[data-theme="rose"]` (D1),
canon neutral hue 270 (D2), Lexend (D4), radius 8/16/24, one 4rem header
token (D3), and the D6 IRS-date content fix. ONE hub deploy.

## ROLLBACK CONDITIONS (written before the first edit)

1. **RC1 — header rhythm.** If a batch page's h1 title/size/alignment
   differs from the pre-batch rendering beyond font metrics (PAGE-CONTRACTS
   H2, runbook rollback condition 2): re-pin the mirror in p31-style.css to
   the reference metrics; unfixable ⇒ revert that page's header swap.
2. **RC2 — grid contract.** Any grid on a batch page without
   `data-p31="grid" data-cols data-even` or with a card-count mismatch ⇒
   fix; unfixable ⇒ revert the page.
3. **RC3 — drift > 0 on an adopted page.** The token-drift-check must report
   0 findings per adopted page; non-zero ⇒ fix the literals; unfixable ⇒
   revert the offending markup.
4. **RC4 — non-batch surfaces change.** Home hero (e6ff2571 parity) or any
   page outside Batch 1 must render identically. Home hero sha is recorded
   across builds (31dea2a0fc0065e9…, reduced-motion). A change ⇒ revert the
   shared-file edit that caused it.
5. **RC5 — gates/e2e.** `npm run prebuild` + `npm run build` green;
   hub-smoke 5 passed / 0 failed; five-dollar-stack 5/5 live. Red ⇒ revert
   the wave, not the gate.

## 1. Per-page adoption (file:line)

Every page: frontmatter CSS imports + `PageHeader` import + `theme="rose"`;
`SectionHeader` L1 → canon-astro `PageHeader` (same text, same h1 level)
with the hub accent bar kept (H2: bar optional); raw color literals removed.

- `src/pages/about.astro:2-11` imports; `:52-66` header swap; `:17-21`
  stackDiagram classDef → named-color placeholders + `id` on the pre
  (`:118`); `:163,167,189,193` rgba fallbacks removed; `:186-190` CTA
  `var(--p31-void)`; `theme="rose"` (`:52`).
- `src/pages/team.astro:1-10` imports; `:19-33` header swap; `:51` rgba
  fallback removed; `theme="rose"` (`:19`).
- `src/pages/faq.astro:10-17` imports; `:57-72` header swap; `:90,101`
  rgba fallbacks removed; `theme="rose"` (`:57`).
- `src/pages/enterprise.astro:8-16` imports; `:111-160` hero header chain →
  PageHeader (eyebrow + title + lede + IDC subtitle + CTAs preserved, same
  text); 4 diagram classDefs → placeholders + pre ids (`:40-44,68-72,
  92-96, 296-304`); `:147, 402` CTA `var(--p31-void)`; `:363-373` signal
  amber fallbacks removed; `theme="rose"` replaces `theme="sunlight"`
  (`:111`).
- `src/pages/research.astro:13-20` imports; `:46-64` header swap (H3 center
  list — `class="page-header-center"` + `page-header-block--center`);
  `:110,137,141,157,161` fallbacks/CTA literals removed; `theme="rose"`
  (`:46`).

## 2. Shared edits (minimal, filed)

- `src/styles/global.css:4-33` — the rose override becomes the data-theme
  swap: `:root[data-theme="rose"]` carries ONLY the live rose accent family
  (D1, values verbatim); `:root:not([data-theme="rose"])` pins the legacy
  hub set for every not-yet-migrated page (home + non-batch surfaces render
  exactly as before — the port queue). Neutrals/font/radius for rose pages
  flow from canon tokens (270 / Lexend / 8-16-24) untouched.
- `src/styles/p31-style.css` — adopted-header hub-metrics mirror
  (subtitle 18px + 42rem measure, enterprise lede 18px full-width; the
  title keeps the canonical bare-h1 51px rule) + `.page-header-block--center`
  bar centering. No color literals.
- `src/layouts/MarketingShell.astro:55-63` — `'rose'` theme id passthrough
  (resolveTheme() does not know it yet — gap-2); `:111-118` Lexend via
  `@fontsource/lexend` (self-hosted, Google link kept for Lora/JetBrains/
  legacy Jakarta); `:290-345` mermaid script resolves the named-color
  placeholders to computed token sRGB hex at render time (mermaid applies
  classDef as inline !important styles — page CSS cannot override; gap-4).
- `src/components/islands/CanonTopbar.tsx:81-91` — mount no longer writes
  the store's hardcoded `ocean` default over the SSR data-theme on fresh
  loads; a stored preference still applies (the pre-batch behaviour
  clobbered every page's SSR theme — measured live: data-theme="ocean"
  everywhere).
- `src/components/SharedFooter.astro:13` — D6: "IRS determination
  2026-09-23" → "2026-05" (owner-confirmed: incorporated 2026-04 Georgia,
  IRS determination 2026-05).
- `apps/p31ca/package.json` — deps added: `@p31ca/canon-parts`,
  `@p31ca/canon-astro` (workspace:*), `@fontsource/lexend` ^5.3.0.
  Lockfile diff: purely additive (7 + 11 lines), no unrelated churn.

## 3. Drift — before / after (token-drift-check, per page)

| Page | before | after |
|---|---|---|
| about | 16 literals | 0 |
| team | 1 | 0 |
| faq | 2 | 0 |
| enterprise | 32 | 0 |
| research | 5 | 0 |

Pages-dir totals: 197 → 141 (the remaining 141 = non-batch pages — the
port queue for later batches). Adopted pages: 0 re-declarations, 0 literals.

## 4. Screenshot verdicts (Playwright, 1440×900, reduced-motion)

Baseline = p31ca.org (deploy ca15f091) captured 2026-10-14 BEFORE edits.
After = local preview of this build. Verdict per page, classified against
the approved-delta list (Lexend metrics / neutral 270 shift / radius / rose
theme):

- **/about — APPROVED.** Header rhythm identical (h1 51px @ x=296 y=160,
  subtitle 18px 2-line @ y=232, bar 64×4 @ y=304); 501(c)(3) grid children
  359×86 both sides; headings + text content identical. Deltas: Inter→
  Lexend, neutrals 75→270, accent cyan→rose.
- **/team — APPROVED.** Header rhythm identical (h1 51px, subtitle 18px,
  bar); all member cards unchanged; text identical.
- **/faq — APPROVED.** Header rhythm identical; all details/copy identical.
- **/enterprise — APPROVED.** Hero h1 51px @ x=296 w=768 start-aligned
  (reference alignment preserved), lede 18px full-column h=112 identical,
  IDC paragraph h=140 identical, eyebrow 12px, h2 sections 38px; the hero
  is 56px shorter ONLY because Lexend fits the title in 2 lines vs Inter's
  3 (font-metric delta). All 4 diagrams render, token-colored.
- **/research — APPROVED.** Center-list header still centered (h1/subtitle/
  bar all centered on the 720px axis), title 51px, subtitle 18px; grid
  3-col even rows; text identical.
- **/ (home) — NOT IN BATCH; UNCHANGED.** Hero sha identical across three
  builds (31dea2a0fc0065e9abf9528a1b1d53c25f2bc3838cc133762f3c9b47f6cabcc1);
  canon-v2.css not referenced; theme still ocean; no batch selector matches
  any home element.

**Two honest findings the verdicts depend on:**

1. **The pre-batch DEPLOY renders a CYAN accent** (computed
   `--p31-accent: oklch(0.78 0.18 195)` on p31ca.org AND on the e6ff2571
   reference) — the deployed bundle's canon css-emit COMPAT_ROOT `:root`
   clobbers the theme modes (same bug as gap-1) and its global.css override
   loses the cascade. The ratified D1 target is rose ("exactly the current
   live look" per the owner's audit evidence); this batch ships rose. The
   cyan→rose delta in the before/after shots is the D1 mandate executing,
   not an unintended diff.
2. **Deployed fonts are Inter** (the deployed bundle predates the canon
   font token); the current source renders Jakarta on legacy pages and
   Lexend on rose pages. Lexend on the batch = the D4 mandate.

## 5. Gates + e2e evidence

- `npm run prebuild` 8/8 green; `npm run build` 40 pages; postbuild
  neurodivergent --dist + WCAG runtime green (one transient
  ERR_NETWORK_CHANGED on the Google-Fonts fetch in a sandboxed run —
  re-run clean; not a product error).
- hub-smoke (preview): 5 passed / 5 documented skips / 0 failed.
- five-dollar-stack + prod-smoke: prod-gated — run post-deploy vs
  p31ca.org (recorded in §6).
- PAGE-CONTRACTS greps per page: one h1 (rendered), grids carry
  data-cols+data-even with matching counts, 0 `display:grid` /
  `grid-template` page-local, 1 page-level mx-auto, no bare Tailwind
  utilities (all page-prefixed), research header centered without
  centering body prose.

## 6. Deploy + live checks

Deploy (ONE): `npm run deploy` → `https://32a9507a.p31ca.pages.dev`,
live on p31ca.org.

- **5 pages HTTP 200**, `data-theme="rose"` on each, computed
  `--p31-accent: oklch(65% .14 45)` (the ratified rose, verbatim),
  `[data-p31="page-header"]` present, exactly one h1 per page.
- **Lexend serving**: `--p31-font-sans` = Lexend on rose pages,
  `document.fonts.load('16px Lexend')` resolves, self-hosted
  `/ _astro/lexend-latin-*.woff2` (no Google request for it).
- **0 console errors** across the 5 pages (Playwright live pass).
- **five-dollar-stack e2e 5/5** vs p31ca.org (sovereign-vs-saas table,
  verify live verdict, runbook allowance table, research Papers-on-Pages
  PDFs, nav atoms). prod-smoke 2 passed / 3 documented skips / 0 failed.
  hub-smoke (preview) 5 passed / 5 documented skips / 0 failed.
- **Home (not in batch)**: live-after hero sha `31dea2a0fc0065e9…` —
  byte-identical to every preview build of this batch; hero TEXT sample
  points 5/5 identical live↔preview; `data-theme="ocean"`, canon-v2.css
  not referenced, no batch selector matches home. vs the e6ff2571
  reference the hero differs — PRE-EXISTING source-vs-reference drift
  (the reference bundle computes cyan/Inter/bg-hue-240; any current-source
  build renders rose/Jakarta/bg-hue-75), flushed live by this deploy and
  recorded here, not a batch regression.
- **IRS dates (D6)**: SharedFooter now reads "IRS determination 2026-05";
  hub-wide grep finds no remaining "May 4" and no IRS citation of
  "2026-09-23" (remaining 09-23 strings are verification dates on
  research/flagships/enterprise claims — not IRS dates — left intact).

## 7. Filed gaps (Ownership Contract)

- **gap-1 — canon css-emit clobbers theme modes.** `packages/canon/
  dist/tokens.css:2113-2236` (:root COMPAT block, same layer, later order)
  overrides `[data-theme="rose"]:2098` — equal specificity, later wins:
  rose-mode `--p31-accent` computes cyan. Workaround: the unlayered
  `:root[data-theme="rose"]` accent block in global.css (higher
  specificity, unlayered). Phase 1 fix: emit COMPAT_ROOT BEFORE the theme
  modes (or drop the accent family from it). Also present: a stray `}` at
  tokens.css:2106.
- **gap-2 — `resolveTheme()` does not know `rose`.** `packages/shared/src/
  theme/ids.ts` — 'rose' is not a ThemeId; MarketingShell passes it through
  verbatim. Phase 1: add rose to the id registry (+ topbar THEME_SWATCH).
- **gap-3 — fontsource install semantics.** `@fontsource/lexend` installs
  cleanly (lockfile diff purely additive) but ANY pnpm add touches the root
  lockfile by construction; judged clean because zero unrelated resolutions
  moved.
- **gap-4 — mermaid classDef cannot carry tokens.** Parser rejects var()/
  oklch(); v12 applies classDef as inline !important styles. Workaround:
  named-color placeholders + runtime token→hex substitution in
  MarketingShell's mermaid script. Phase 1: a mermaid theme-mode token map.
- **gap-5 — public/lib/p31-fluid.css** left untouched per instruction —
  legacy asset, stays on the drift ledger.
- **gap-6 — deployed-bundle cascade loss.** The live deploy renders cyan +
  Inter while the same source builds rose + Jakarta: the deployed bundle's
  import order/emission differs from the current source (pre-existing,
  not this batch). Resolved by this batch's deploy (rose ships live).

<!-- P31-FOOTER
checksum: pending
related: p31ca-phase2-wrappers-2026-10-13.md, parallel-paths-enterprise-runbook.md
audit_chain: pending
-->