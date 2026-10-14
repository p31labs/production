<!-- P31-HEADER
id: p31_fix_plan_p31ca_void_fill_hub_20261012_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: p31ca.org hub void-fill wave (POSITIONING items 1, 3, 4, 5, 6, 7, 9)

**Discovered by:** agent:subagent:void-fill-hub (the p31ca.org wave in
`apps/p31ca/docs/STRATEGIC-POSITIONING.md` §Voids → actions)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (seven locked voids; items 3/4/5 were canon-contract
voids, mirrored locally because the hub's markup is not canon PageHeader/Grid)

## The gaps

1. **HTML comments leaked into the DOM (item 1).** Every `<!-- -->` in the
   .astro templates rendered into the served HTML (the visible comment text
   "across the top" bug) — 27 comment lines across 5 files.
2. **Title alignment (item 3).** The parallel canon-v2 contract targets
   `[data-p31="page-header"][data-align=…]`; the hub's headers are hub-built
   (`.home-hero`, `SectionHeader`, flagship/enterprise heroes) — no
   `data-align` anywhere, no local mirror.
3. **Uneven card grids (item 4).** Home grids used auto-fit minmax only; no
   explicit column counts or equal-height rows — card footers ragged by
   content height.
4. **Underline-on-hover (item 5).** Hub CSS underlined a link on hover
   (`.home-stats__sublink:hover`); no card-hover or underline-draw contract
   applied locally; prose links not guaranteed underlined (WCAG 1.4.1).
5. **AI discoverability (item 6).** Organization/SoftwareApplication/
   BreadcrumbList JSON-LD missing from the shell and /apps/* pages (FAQPage
   already existed on /faq).
6. **Performance (item 7).** CommandPalette, LedController, LiveRegistryStats
   all hydrated `client:load` — deferred work on the critical path.
7. **Agent posture (item 9).** robots.txt had no Content-Signal.

## The fix

### 1. Comment leak — stripped + gate

All 27 `<!-- -->` lines converted to `{/* */}` Astro comments (never rendered;
the `{/* */}` pattern already existed in FlagshipPage) or folded into
frontmatter `//` comments. Files:

| File | Lines changed | Notes |
|---|---|---|
| `src/layouts/MarketingShell.astro` | 6 comment blocks | incl. the "persist root" + WebMCP trial notes |
| `src/pages/index.astro` | 6 section markers | |
| `src/pages/about.astro` | 7 section markers | |
| `src/pages/get-involved.astro` | 3 markers | |
| `src/pages/blog/[slug].astro` | 4 blocks | h-entry / webmention / Standard.site / webmentions |

New gate `scripts/verify-no-html-comments.mjs` (plain node): walks
`src/**/*.astro`, fails on any `<!--` hit (source must have zero; the
runtime `<!--astro:end-->` marker is generated, never written in source).
Wired FIRST in the prebuild chain (`package.json` line 7, before
verify-ground-truth).

Negative control proven:

```
printf '<div><!-- NEG-CONTROL planted comment --></div>' > /tmp/opencode/neg-control.astro
node scripts/verify-no-html-comments.mjs /tmp/opencode/neg-control.astro  → exit 1 (1 hit reported)
node scripts/verify-no-html-comments.mjs                                  → exit 0 (clean)
```

Live assertion: `curl https://p31ca.org/` contains none of "persist root",
"WS-3 WebMCP", "Mermaid: render", "Swap-fade", "═══" (0 hits after deploy).
Remaining `<!--astro:end-->` markers in served HTML are Astro runtime
hydration boundaries — expected, invisible, not source comments.

### 2. data-align — applied to hub markup + local mirror

The hub headers are NOT canon PageHeader, so `data-align` is applied to the
hub structures and mirrored in `src/styles/p31-style.css` (local fallback,
same shape as the canon contract: centered title+subtitle, subtitle ≤65ch
`margin-inline: auto`; body prose never centered).

| Surface | Markup | Value |
|---|---|---|
| index hero | `src/pages/index.astro:89` `.home-hero` | `data-align="center"` |
| /apps/* flagship hero | `src/components/marketing/FlagshipPage.astro:53` `.flagship-hero` (+ `__text/__meta/__title/__lede/__ctas` classes) | `data-align="center"` |
| /enterprise hero | `src/pages/enterprise.astro:116` `.enterprise-hero` (+ `__subtitle/__ctas`) | `data-align="center"` |
| SectionHeader (all reading surfaces) | `src/components/marketing/SectionHeader.astro:11` — emits `data-align={align === 'center' ? 'center' : 'start'}`, `hub-header` + `hub-header__title/__subtitle` classes | center by default, `start` for align="left" |
| /about /faq /privacy /terms /blog/* | already pass `align="left"` → `data-align="start"`; `src/pages/blog/index.astro:33` and `src/pages/blog/[slug].astro:35` changed to `align="left"` | `start` |

Mirror rules: `src/styles/p31-style.css` — `.home-hero[data-align="center"]`,
`.hub-header[data-align="center|start"]`,
`.flagship-hero[data-align="center"] .flagship-hero__text/__lede/__ctas/__meta`,
`.enterprise-hero[data-align="center"]` (h1 + `__subtitle` centered,
`__subtitle` ≤65ch inline-auto, CTA rows `justify-content: center`).

### 3. data-cols / data-even — applied to home grids + local mirror

| Grid | Markup | Attrs |
|---|---|---|
| flagships (8 cards → 4×2) | `src/pages/index.astro:137` `.home-grid--4` | `data-cols="4" data-even` |
| open research (2×2) | `src/pages/index.astro:183` `.home-grid--2` | `data-cols="2" data-even` |
| how-to-start (3 cards → 4×1) | `src/pages/index.astro:206` `.home-grid--3` | `data-cols="4"` |

Local mirror in `p31-style.css`: `[data-cols="4"|"2"]` column counts,
`[data-even]` → `grid-auto-rows: 1fr; align-items: stretch`, children
flex-column, `:last-child { margin-top: auto }` (footer pin); responsive
collapse 4→2 at ≤56.24rem and →1 at ≤34.99rem — matching the parallel
canon-v2 breakpoints (canon-v2.css:263-271).

### 4. Hover contract — local mirror

- Removed the only hub underline-on-hover: `.home-stats__sublink:hover`
  (`p31-style.css`) — the link got `.underline-draw` instead
  (`src/pages/index.astro:110`).
- Card hover: `a.glass-panel:hover, a.glass-card:hover` →
  `translateY(-2px)` + accent border glow (`color-mix` accent 45% border,
  1px 22% ring + 40% shadow); `.hub-card__cta` color shift to accent and
  `[aria-hidden="true"]` arrow `translateX(2px)`. `.hub-card` + `.hub-card__cta`
  applied to flagships/research/how-to-start cards in `index.astro`; the
  redundant tailwind `hover:-translate-y-0.5` removed from the flagships card
  (contract lift is the single source). `group` added to blog index cards so
  the pre-existing `group-hover:translate-x-1` arrow slide actually fires
  (`src/pages/blog/index.astro:37`).
- Underline Draw: `.underline-draw` with `::after` scaleX(0→1) on hover AND
  focus-visible, applied to "View all N publications →"
  (`index.astro:195`), the stats "live endpoint" link, and the ResearchCard
  DOI link (`src/components/marketing/ResearchCard.astro:40`, replacing
  `hover:underline`).
- Inline prose links underlined ALWAYS (WCAG 1.4.1): `p a`, `.h-entry a`,
  `.prose a` (excluding `.btn`/`.underline-draw`) →
  `text-decoration: underline; text-underline-offset: 2px` in
  `p31-style.css`.

### 5. JSON-LD (item 6)

| Block | Where | Evidence |
|---|---|---|
| Organization (name, url, logo, taxID 42-1888158, nonprofitStatus, foundingDate, sameAs GitHub+Zenodo) | `src/layouts/MarketingShell.astro` frontmatter + head (every page) | live `/`: `"@type":"Organization"`, `"taxID":"42-1888158"` |
| SoftwareApplication (name, url, applicationCategory, operatingSystem, description, provider→Organization) | `src/components/marketing/FlagshipPage.astro` (all 8 /apps/* pages) | live `/apps/mcp/`: `"@type":"SoftwareApplication"` |
| FAQPage (16 entries from the content collection) | already present `src/pages/faq.astro` — verified still valid | live `/faq/`: `"@type":"FAQPage"` |
| BreadcrumbList (path-derived, last crumb = page title) | `src/layouts/MarketingShell.astro` head, emitted only on inner pages | live `/about/`, `/apps/mcp/`: `"@type":"BreadcrumbList"` |

All emitted via `<script type="application/ld+json" set:html={JSON.stringify(...)} />`
(Astro escapes safely; set:html prevents double-encoding).

### 6. Island directive audit (item 7)

| Island | Before | After | Evidence (built output client attrs) |
|---|---|---|---|
| CommandPalette | `client:load` | `client:idle` | `MarketingShell.astro:157` |
| LedController | `client:load` | `client:visible` | `MarketingShell.astro:158` |
| LiveRegistryStats (index) | `client:load` | `client:idle` | `index.astro:108` |
| Starfield + MolecularHeart | `client:load`/`client:only` | unchanged (the dome is the beat, above-fold) | |
| CanonTopbar | `client:load` | unchanged | |

Built `/` serves `client="idle"` ×2, `client="visible"` ×1, `client="load"`
×2, `client="only"` ×1 — matches the audit exactly.

### 7. Content-Signal (item 9)

`public/robots.txt` — added after the crawler allows:
`Content-Signal: search=yes, ai-input=yes, ai-train=no` (agents may read and
use, not train). Sitemap lines untouched. Live-verified:
`curl https://p31ca.org/robots.txt | grep '^Content-Signal'` ✓.

## Verification evidence

- `npm run prebuild` green — comment gate first, then the five existing
  verify steps + substack bridge.
- `npm run build` green (astro build, 0 errors).
- Gate negative control: planted comment → exit 1; clean tree → exit 0
  (commands above).
- Local probe (`wrangler pages dev dist --port 4321` + playwright chromium
  from `portals/design/node_modules`, probe script in
  `/tmp/opencode/probe-hub-chrome.mjs`): / and /apps/mcp/ — 0 console errors,
  0 page errors, all five chrome elements (CanonTopbar `nav[aria-label="Primary
  navigation"]`, CommandPalette FAB, LedController chip, `canvas.starfield`,
  `.molecular-heart-layer`) present.
- `npm run deploy` green (3 deploys over the wave; final
  `8cb0b2d3.p31ca.pages.dev`).
- Live curl checks: no comment-leak text on /; `data-align="center"` on /
  and /apps/mcp/, `data-align="start"` on /about/; `data-cols`/`data-even`
  on home grids (flagships 4+even, research 2+even, how-to-start 4); all
  four JSON-LD types live; Content-Signal live.
- Live playwright probe: PROBE OK on / and /apps/mcp/ (two earlier runs hit
  transient `ERR_NETWORK_CHANGED` — a sandbox network condition; re-runs
  clean with all chrome present and zero page errors).

## Notes / follow-ups

- Hub headers are NOT canon PageHeader/Grid — the data-align/data-cols/
  data-even attributes are forward-compatible markers; the local mirror in
  `p31-style.css` owns the visual until hub markup adopts the canon
  structures (then the canon rules at canon-v2.css:194-271, 643-697 take
  over and the mirror can retire).
- Pre-existing, out of scope (noted, not fixed — needs its own fix-plan if
  picked up): `BaseLayout.astro:15` passes a `canonical` prop that
  `MarketingShell` does not declare, and MarketingShell hardcodes
  `<link rel="canonical" href="https://p31ca.org" />` for every page —
  inner pages currently declare the homepage as canonical (adjacent to the
  new BreadcrumbList URLs).