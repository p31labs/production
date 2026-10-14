<!-- P31-HEADER
id: p31ca_unification_badge_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# Fix-Plan — p31ca hub unification: "Live in production" badge removal + flagship pages onto the about/team look

**Scope:** `/home/p31/production/apps/p31ca/**` only.
**Reference visual contract:** `e6ff2571.p31ca.pages.dev` (per
`p31ca-visual-nav-fix-2026-10-13.md`); the aligned target pages are
`/about` and `/team` (SectionHeader `align="left"`, `max-w-4xl` container).
**Owner directive:** remove the badge (delete markup, not hide); unify the
flagged pages onto the about/team look — same width, same header treatment,
same spacing — with one deploy.

## 1. Badge root cause (evidence)

- `src/components/marketing/LiveProofPanel.astro:10` — `statusLine` defaults
  to `'Live in production'`; the component renders a bordered card with a
  green status dot, the status line, and a list of external links.
- `src/components/marketing/FlagshipPage.astro:79` (pre-change) rendered
  `<LiveProofPanel urls={f.links.slice(0, 3)} statusLine="Live in production" />`
  as the **second cell of the hero's two-column grid**
  (`flagship-hero … fp-grid fp-md-grid-cols-2 fp-gap-12 fp-items-center`).
  The hero text sat in the left cell and the proof card in the right cell —
  the card pinned the text column left and, with the centered
  `data-align="center"` hero styling, made the whole header look left-shifted
  and inconsistent with the start-aligned reference pages.
- `FlagshipPage` is the single template for all 8 `/apps/*` surfaces
  (`cli, loom, lumi, mcp, qpj, spaceship-earth, meatspace, governance`), so
  the badge surfaced on every flagship page. No other page in `src/**`
  renders `LiveProofPanel` (grep: only the FlagshipPage import + usage).

## 2. What was removed / changed

### Badge removal (markup deleted, not hidden)
- `FlagshipPage.astro`: `import LiveProofPanel …` line and the
  `<LiveProofPanel … />` element deleted. The hero's 2-col grid was
  dismantled entirely (see header unification below) — no dangling grid
  track or empty wrapper remains.
- `LiveProofPanel.astro` stays on disk (no-delete rule) but is no longer
  imported or rendered anywhere; its `lp-` rules stay in
  `sweep-legacy.css` (managed file, do-not-hand-edit).
- Honest note: the removed panel carried the only rendering of the flagship
  `links[]` data (live URL + npm/verify links). Those URLs remain reachable
  via the page CTA and the JSON-LD `url`; the `links`/`headline` data fields
  are now unused in markup but retained in `src/data/flagships.ts`
  (single source of truth — no data deletion). The hero meta row (icon,
  `● Live` status pill, mono URL) was removed with the old hero; the only
  `vision`-status flagship (Spaceship Earth) still states
  "A vision in active development" in its lede and FAQ, so the honesty
  signal is preserved.

### Header + container unification onto the about/team chain
- `FlagshipPage.astro` — full template rewrite:
  - Container: `fp-max-w-7xl` (80rem) → **`fp-max-w-4xl` (56rem)** — exactly
    the `/about`/`/team` container. No page wider than the reference.
  - Header: the custom centered serif hero is replaced by the shared
    **`<SectionHeader level="1" title={f.name} description={f.lede}
    align="left" />`** — the same PageHeader chain as about/team
    (`hub-header` + `sh-` classes, `data-align="start"`, accent bar).
    Title/description rhythm = page name + lede, identical shape to
    "About" + its description.
  - CTA row: primary CTA + "See it work ↓" kept right under the header,
    restyled to the about-page CTA recipe (`rounded-full px-6 py-3 text-sm
    font-semibold`).
  - Section spacing: content wrapped in `fp-mt-16 fp-space-y-8` (about's
    rhythm); per-section `mb-20` margins removed; section h2s converted from
    centered serif-400 to start-aligned sans-bold `text-2xl` (about's h2
    rhythm); the explore section's `max-w-3xl mx-auto` + `text-center`
    wrapper removed (full container width, start-aligned).
  - Capabilities grid keeps the canon recipe
    `data-p31="grid" data-cols="2" data-even`.
- `FAQ.astro` (FlagshipPage-only): dropped `fa-mb-20` + the
  `fa-max-w-3xl fa-mx-auto` wrapper; h2 → start-aligned sans-bold.
- `FinalCTA.astro` (FlagshipPage-only): dropped `fc-pb-16`; h2 → sans-bold
  (stays centered like /about's closing CTA section).
- `src/styles/sweep-legacy.css` — 9 rules appended via the sanctioned
  `scripts/sweep-legacy-add.mjs` (verbatim compiled bodies):
  `.fp-max-w-4xl`, `.fp-mt-6`, `.fp-mt-16`, `.fp-font-bold`,
  `:where(.fp-space-y-8…)`, `.fa-font-bold`, `.fc-font-bold`,
  `.td-rounded`, `.en7f-max-w-4xl`.
- H4 sweep hygiene on the flagged pages: swept the 3 pre-existing bare
  `rounded` utilities in `src/components/islands/TerminalDemo.tsx:41,48,49`
  (rendered on /apps/cli) → `td-rounded` + compiled rule. Inventory re-run:
  0 candidates.

### /enterprise (nav "Stack")
- `/enterprise` is **not** a FlagshipPage surface and has no badge; the
  previous wave already set its hero `data-align="start"` per the reference.
  This wave unified its container width so the five-page walk stays
  consistent: `en7f-max-w-7xl` → `en7f-max-w-4xl`
  (`src/pages/enterprise.astro:116`) + compiled rule. Its start-aligned hero
  content (sourced IDC / Agentic AI Institute claims) is retained —
  noted here for owner confirmation if full SectionHeader-ization of
  /enterprise is wanted later.

## 3. Verification (preview build, local Playwright @1440px)

All ten pages measured: `/about`, `/team`, `/apps/cli`, `/apps/loom`,
`/apps/lumi`, `/apps/mcp`, `/apps/spaceship-earth`, `/apps/qpj`,
`/apps/meatspace`, `/apps/governance` (+ `/enterprise` after the width fix):

- h1 box: x=296, w=848, top=160, `text-align:left`,
  `data-align="start"` — **identical across all pages**.
- Container box: x=272, **w=896 (56rem)** — identical across all pages
  (flagships previously 1280px/80rem).
- `Live in production` absent from every page body.
- Heading outline H1→H2→H3, no skips (e.g. /apps/cli: 1 h1, 7 h2, 4 h3).
- 0 console errors across the walk.

## 4. Gates

- `npm run prebuild` green (no-html-comments, ground-truth,
  content-sources, content-consistency, compliance-drift, neurodivergent,
  WCAG static).
- `npm run build` green — 40 pages; postbuild `check-neurodivergent --dist`
  green. `verify-wcag22 --runtime` green on re-run; two intermittent runs
  failed only on `ERR_NETWORK_CHANGED` from the external
  `mcp-registry.trimtab-signal.workers.dev` fetch on `/` (network flake on
  this box, unrelated to this wave — home page untouched).

## 5. Deploy + live evidence (executed 2026-10-13, deploy b8e137d8)

- ONE deploy: `npx wrangler pages deploy` → **b8e137d8** (43 files uploaded,
  511 unchanged).
- Live grep vs p31ca.org: `Live in production` / `lp-` panel markup **absent**
  from served HTML on all 8 `/apps/*` pages (cli, loom, lumi, mcp, qpj,
  spaceship-earth, meatspace, governance); container is `fp-max-w-4xl` on
  every one; `/enterprise` serves `en7f-max-w-4xl`.
- Live DOM walk (Playwright @1440px, p31ca.org):
  `/about → /team → /apps/cli → /enterprise → /apps/loom → /apps/lumi →
  /apps/spaceship-earth` — container **x=272 w=896** and start-aligned h1 at
  **x=296** on every page (about/team and all flagships byte-identical
  geometry; enterprise h1 at the same x within the same 896px container).
- `scripts/console-check.mjs` vs live: **0 console errors** across
  /about, /team, /apps/cli, /enterprise, /apps/loom, /apps/lumi,
  /apps/spaceship-earth, /apps/mcp.
- e2e vs live: `five-dollar-stack.spec.ts` **5/5 passed**; no e2e/tests
  assert the removed panel.

<!-- P31-FOOTER
checksum: pending
related: p31ca-visual-nav-fix-2026-10-13.md, h4-collapse-tooling-2026-10-13.md
audit_chain: pending
-->