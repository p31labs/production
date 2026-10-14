<!-- P31-HEADER
id: p31_page_audit_20261013_v1.0
type: research
component: docs/enterprise/design-system
status: live
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# Page-Surface Audit — headers, containers, grids, badges (Phase 0)

Phase 0 deliverable 2. Read-only scan of every page surface in
`apps/p31ca/src/pages` (39 files) and `apps/phosphorus31` (2 orphaned view
components, 2 layouts, 0 routable pages), measured against the contracts in
[PAGE-CONTRACTS.md](PAGE-CONTRACTS.md). Reference for "aligned":
`e6ff2571.p31ca.pages.dev` — about/team/faq start-aligned, home-hero and
research/arcade centered, enterprise start (see
`docs/fix-plans/p31ca-visual-nav-fix-2026-10-13.md`).

Contract codes used in the table:
**C1** container (80rem `page-max`, one padding, nothing wider) ·
**H1** one PageHeader/SectionHeader chain, start-aligned per reference ·
**G1** `data-p31="grid"` + `data-cols` + `data-even`, no page-local grid CSS ·
**B1** no floating badge/card in page layout flow.

## 1. apps/p31ca — 39 page files

| Page | Header component | Align | Container (page-local) | Grid | Badge |
|---|---|---|---|---|---|
| `/` index | custom `.home-hero` (no SectionHeader) | center (hero) — reference-sanctioned | `<main class="home">` — **no `#main-content` shell container** ⚠C1 | `data-cols` 4/2/3 + `data-even` ×3, but **legacy `home-grid home-grid--N` classes retained** ⚠G1 | none |
| `/about` | SectionHeader L1 | left→start ✓ | `abf6-max-w-4xl` (56rem) ⚠C1 | grid 2 + even ✓ | none |
| `/team` | SectionHeader L1 | left→start ✓ | `te7e-max-w-4xl` ⚠C1 | none | none |
| `/faq` | SectionHeader L1 | left→start ✓ | `fa8b-max-w-3xl` (48rem) ⚠C1 | none | none |
| `/enterprise` (**Stack**) | custom `.enterprise-hero` + SectionHeaders | hero `data-align="start"` ✓ (fixed per reference) | `en7f-max-w-7xl` (80rem) ✓ + nested `max-w-3xl` sections | grid 3+even ×3 ✓ | 4 × "in production" — table cells + mermaid label (content copy, not floating cards) ✓B1 |
| `/research` | SectionHeader (default center) | center — reference-sanctioned | `rec9-max-w-7xl` ✓ | grid 3+even ✓ | none |
| `/arcade` | SectionHeader L1 (default center) | center — reference-sanctioned | `ar08-max-w-7xl` ✓ | grid 3+even ✓ | none |
| `/docs` | SectionHeader (default center) | center ⚠H1 (ref has no /docs; docs index predates alignment) | `dc99-max-w-7xl` ✓ | grid 3+even ×2 ✓ | none |
| `/hire` | raw `<h1>` (no SectionHeader) ⚠H1 | — | `hiee-max-w-7xl` ✓ + nested `max-w-3xl` ⚠C1 | **legacy `hiee-grid hiee-md-grid-cols-2`** ⚠G1 | none |
| `/journey` | JourneyHub island (own centered `.journey-hub`) ⚠H1 | center (page-local CSS `text-align:center`) | `jo7d-max-w-7xl` ✓ | **page-local `<style>` grid CSS** (`.journey-section`, `.journey-card`) ⚠G1 | none |
| `/donate` | SectionHeader L1 | left→start ✓ | `doa1-max-w-4xl` + `max-w-xl` ⚠C1 | grid 3+even ✓ | none |
| `/get-involved` | SectionHeader L1 (default center) | center ⚠H1 | `gebb-max-w-5xl` (64rem) ⚠C1 | grid 3+even ✓ + **grid 2 with NO `data-even`** ⚠G1 | none |
| `/verify` | SectionHeader (default center) | center ⚠H1 | `vea1-max-w-4xl` ⚠C1 | grid 3+even ✓ | none |
| `/press` | SectionHeader L1 | left→start ✓ | `prd3-max-w-3xl` ⚠C1 | grid 2+even ✓ | none |
| `/ways-to-give` | SectionHeader L1 | left→start ✓ | `waa0-max-w-5xl` ⚠C1 | grid 2+even ✓ | none |
| `/sovereign-vs-saas` | SectionHeader (default center) | center ⚠H1 | `sod3-max-w-7xl` ✓ | none | 2 × "in production" (body prose) ✓B1 |
| `/accessibility` | SectionHeader L1 | left→start ✓ | `acf1-max-w-3xl` ⚠C1 | none | none |
| `/annual-report` | SectionHeader L1 | left→start ✓ | `anf3-max-w-4xl` ⚠C1 | none | none |
| `/compliance` | SectionHeader L1 | left→start ✓ | `co50-max-w-4xl` ⚠C1 | none | none |
| `/financials` | SectionHeader L1 | left→start ✓ | `fi65-max-w-4xl` ⚠C1 | **legacy `fi65-grid fi65-grid-cols-1 fi65-sm-grid-cols-2`** ⚠G1 | none |
| `/privacy` | SectionHeader L1 | left→start ✓ | `pr06-max-w-3xl` ⚠C1 | none | none |
| `/security` | SectionHeader L1 | left→start ✓ | `se6b-max-w-3xl` ⚠C1 | none | none |
| `/terms` | SectionHeader L1 | left→start ✓ | `te90-max-w-3xl` ⚠C1 | none | none |
| `/treasury` | SectionHeader L1 | left→start ✓ | `trd0-max-w-4xl` ⚠C1 | none | none |
| `/runbook` | SectionHeader (default center) | center ⚠H1 | `ru1b-max-w-4xl` ⚠C1 | none | none |
| `/signin` | raw `<h1>` (auth card) ⚠H1 | — | `si3a-max-w-md` (28rem) ⚠C1 | none | none |
| `/signup` | raw `<h1>` (auth card) ⚠H1 | — | `si88-max-w-md` ⚠C1 | none | none |
| `/404` | raw `<h1>` ⚠H1 | — | `nf-max-w-4xl` ⚠C1 | none | none |
| `/blog/` | SectionHeader L1 | left→start ✓ | `in59-max-w-4xl` ⚠C1 | none | none |
| `/blog/[slug]` | (post template) | — | — | — | — |
| `/blog/mcp-marketplace` | (post template) | — | — | — | — |
| `/blog/rss.xml.ts` | n/a (feed) | — | — | — | — |
| `/apps/cli` (**CLI**) | FlagshipPage hero `data-align="center"` | center (flagship template) ⚠H1 | `fp-max-w-7xl` ✓ | grid 2+even (FlagshipPage:106) ✓ | **LiveProofPanel "Live in production" card (FlagshipPage:79)** ⚠B1 + `● Live` hero pill |
| `/apps/loom` (**tools**) | FlagshipPage hero | center ⚠H1 | `fp-max-w-7xl` ✓ | grid 2+even ✓ | LiveProofPanel card ⚠B1 + `● Live` pill |
| `/apps/lumi` (**ask**) | FlagshipPage hero | center ⚠H1 | `fp-max-w-7xl` ✓ | grid 2+even ✓ | LiveProofPanel card ⚠B1 + `● Live` pill |
| `/apps/spaceship-earth` (**scene**) | FlagshipPage hero | center ⚠H1 | `fp-max-w-7xl` ✓ | grid 2+even ✓ | LiveProofPanel card ⚠B1 + `● Live` pill |
| `/apps/governance` | FlagshipPage hero | center ⚠H1 | `fp-max-w-7xl` ✓ | grid 2+even ✓ | LiveProofPanel card ⚠B1 + `● Live` pill |
| `/apps/mcp` | FlagshipPage hero | center ⚠H1 | `fp-max-w-7xl` ✓ | grid 2+even ✓ | LiveProofPanel card ⚠B1 + `● Live` pill |
| `/apps/qpj` | FlagshipPage hero | center ⚠H1 | `fp-max-w-7xl` ✓ | grid 2+even ✓ | LiveProofPanel card ⚠B1 + `● Live` pill |
| `/apps/meatspace` | FlagshipPage hero | center ⚠H1 | `fp-max-w-7xl` ✓ | grid 2+even ✓ | LiveProofPanel card ⚠B1 + `● Live` pill |

Badge copy note: `apps/phosphorus31/src/data/manual-posts.json:19` contains the
string "live in production" — **blog body copy** ("…the P31 Sovereign Mesh was
live in production…"), not a UI badge. It is content in a data file, not a
layout violation; flagged for the record because the grep asked for it.

## 2. apps/phosphorus31 — surfaces

| Surface | File | Route | Header | Container | Grid | Badge |
|---|---|---|---|---|---|---|
| HomeView | `src/components/HomeView.astro` | **none — orphaned** (no page imports it) | raw `h1` hero, center | `max-w-7xl mx-auto px-6` (Tailwind) | **Tailwind `grid grid-cols-2 md:grid-cols-4`** ⚠G1 | **hero violet pill** (`bg-quantum-violet/20 … rounded-full`, HomeView:9) ⚠B1 |
| TransparencyView | `src/components/TransparencyView.astro` | **none — orphaned** | raw `h1` ("The Glass Box") | `max-w-5xl` (64rem) ⚠C1 | Tailwind `grid-cols-1 md:grid-cols-3/2/4` ⚠G1 | none |
| Layout.astro | `src/layouts/Layout.astro` | not routed | — | `body min-h-screen flex flex-col` + inline `.skip-link { background:#0ff }` hardcoded hex ⚠ | — | — |
| BaseLayout.astro | `src/layouts/BaseLayout.astro` | not routed | — | `flex-grow #main-content` | — | — |
| manual-posts.json | `src/data/manual-posts.json` | data | — | — | — | "live in production" blog copy (see above) |

**Phosphorus31 headline:** `src/pages/` contains only `api/health.ts`. The
site builds **zero routable pages** — HomeView/TransparencyView are dead
components, both layouts unrouted, `astro.config.mjs` output static. Every
token/theme file in S18/S19 is therefore unconsumed in production.

## 3. Violation count vs PAGE-CONTRACTS.md

| Contract | Violating pages | Count |
|---|---|---|
| C1 container ≠ 80rem / no shell container | index (no `#main-content`), about, team, faq, accessibility, annual-report, compliance, donate, get-involved, press, privacy, security, terms, treasury, verify, ways-to-give, financials, 404, blog/index, signin, signup, hire (nested 3xl), runbook + TransparencyView | **24** |
| H1 no single header chain / wrong alignment | index (custom hero), hire, journey, 404, signin, signup, 8 × FlagshipPage (custom hero, center), docs/verify/runbook/get-involved/sovereign-vs-saas (SectionHeader default center ≠ reference start — reference only centers home-hero/research/arcade) | **19** |
| G1 legacy or local grid CSS | index (home-grid classes), hire (`hiee-grid-cols`), financials (`fi65-grid-cols`), journey (page-local `<style>` grid), get-involved (grid 2 without `data-even`), HomeView + TransparencyView (Tailwind grid utilities) | **7** |
| B1 floating badge/card in flow | 8 × FlagshipPage (LiveProofPanel card + `● Live` pill), HomeView violet pill | **9** |

Total distinct violating surfaces: **37 of 39 p31ca page files + 2 of 2
phosphorus31 views** (several pages violate 2+ contracts; the only clean
p31ca pages by these four contracts are `enterprise` and `research`).

## 4. Flagged pages — extra scrutiny (CLI, Stack, tools, ask, scene)

Nav mapping (`apps/p31ca/src/lib/nav.ts`): Stack→`/enterprise`,
tools→`/apps/loom`, ask→`/apps/lumi`, scene→`/apps/spaceship-earth`,
CLI→`/apps/cli`.

- **CLI** (`apps/cli.astro`): 5-line wrapper → FlagshipPage. Inherits all
  FlagshipPage findings: centered hero (reference-aligned for product pages
  per /hire template, but outside the SectionHeader chain), LiveProofPanel
  floating card, `● Live` pill (double badge), 2-col grid OK.
- **Stack** (`enterprise.astro`): the **best-behaved flagged page** —
  hero `data-align="start"` per reference, 80rem container, three 3-col
  even grids. Residual: nested `max-w-3xl` prose sections (C1) and 4
  "in production" strings (content, allowed).
- **tools/ask/scene** (`loom`/`lumi`/`spaceship-earth`): all FlagshipPage.
  Identical findings to CLI. `scene` additionally mounts SpaceshipDome
  (WebGL) — dome host is shell-owned (`#p31-dome-host`, fixed wave
  `ca15f091`), no container violation from the canvas.
- Cross-cutting: FlagshipPage's `fp-max-w-7xl fp-mx-auto fp-px-6 fp-md-px-12 fp-lg-px-16`
  doubles the MarketingShell centering (page re-centers inside `#main-content`),
  and its LiveProofPanel is exactly the "floating badge card" pattern the
  B1 contract bans estate-wide.

## 5. Method + evidence notes

- Per-page extraction: `grep -oE 'align="[a-z]+"'`, `max-w-[0-9a-z]+`,
  `data-p31="grid"`, `data-cols`, `data-even`, `-iE "live in production|in production"`.
- Header chain = SectionHeader (L1) or FlagshipPage hero; align prop
  `left`→`data-align="start"` inside SectionHeader (verified in component).
- The e6ff2571 reference alignment set (from
  `p31ca-visual-nav-fix-2026-10-13.md` §1): about/team/faq/enterprise start;
  research/arcade/home-hero center.
- No files were modified during this audit.