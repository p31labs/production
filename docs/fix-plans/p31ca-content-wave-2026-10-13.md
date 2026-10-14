<!-- P31-HEADER
id: p31_fix_plan_p31ca_content_wave_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: archive-90d
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix: AI-visibility content wave — CanonFooter import fix + answer-first structure on /about, /enterprise, /research, /faq

## Scope

AI-visibility lever per `apps/p31ca/docs/STRATEGIC-POSITIONING.md`: content
STRUCTURE (answer-first openings, attributed expert quotes, sourced stats,
named DOI references). JSON-LD stays hygiene-only — untouched. The
/sovereign-vs-saas page untouched (deployed and good). No invented experts,
quotes, stats, or papers: every quote is verbatim from a verifiable source;
every stat carries an inline source; our own numbers are marked as ours.

## 1. CanonFooter fix (pre-existing mismatch)

**Symptom:** `src/components/islands/CanonFooter.tsx:9` imported
`{ Footer, type FooterColumn, type FooterLink }` from `@p31ca/ui/chrome` and
line 42 rendered `<Footer blurb=… links=… products=… organization=… />`.

**Root cause:** the chrome package exports a prop-less STATIC `Footer`
(`@p31ca/ui/src/chrome/Footer.tsx`, exported via `src/chrome/index.ts`) —
no `FooterColumn`/`FooterLink` types, no data props. The phantom props were
silently ignored at render, so live /treasury shows the static composition.
The data-driven composition DOES exist at
`@p31ca/design-core/compositions/Footer` (`packages/design-core/src/compositions/Footer.tsx:28`,
exported at `compositions/index.ts:16`) with `columns`/`tagline`/`copyright`
props — but its `site-footer` markup has no CSS shipped in this app
(grep: zero `site-footer` hits in `apps/p31ca/src` or `design-core/src/css`),
so swapping to it would break the deployed look.

**Fix (landed):** `CanonFooter.tsx` now imports the real chrome export
(`import { Footer } from '@p31ca/ui/chrome';` — line 21) and renders
`<Footer />` (line 24). All phantom types/props/data constants removed.
Rendered output verified byte-identical to live /treasury (diff vs
https://p31ca.org/treasury/ shows only Cloudflare's edge email-obfuscation
of the `mailto:` link, applied at the edge post-deploy — not a content
difference).

## 2. /about — `src/pages/about.astro`

- **Answer-first opening** (line 58): 56-word lead — "P31 Labs is a
  501(c)(3) nonprofit building sovereign AI tools for neurodivergent
  families…" (40–75-word band, verified by count).
- **Sourced stat** (line 74): Gartner $80B 2026 sovereign cloud IaaS
  forecast (+35.6%), inline link to the Gartner press release (2026-02-09).
- **Expert quote 1** (line 89): "The human mind does not store reality —
  it constructs it." — William R. Johnson, *Consciousness, Memory, and the
  Architecture of Self-Preservation* (P31 Research Paper III), verbatim
  from the repo's own PDF (`public/papers/consciousness-memory-architecture.pdf`),
  cited by DOI 10.5281/zenodo.19416491.
- **Our numbers, marked ours** (line 110): "Our live registry lists 44
  servers, 22 live, 135 tools (as of 2026-10-13) · 7 live flagship surfaces
  · 22 DOI-verified papers on Zenodo · EIN 42-1888158" — registry +
  Zenodo links inline.
- **Expert quote 2** (line 125): Buckminster Fuller, 1972 Playboy
  interview trimtab passage, verbatim, cited to The Marginalian (2015).
- **Named DOI references** (lines 162–167): h3 "Citable evidence — named
  references" — Tetrahedron Protocol 10.5281/zenodo.19004485, Genesis
  Whitepaper 10.5281/zenodo.19411363, Paper XII 10.5281/zenodo.19782969,
  Paper III 10.5281/zenodo.19416491 (all `https://doi.org/` resolver links).
- Paper XIV / Paper XX referenced by DOI in the geometric-anchor section
  (line ~138).

## 3. /enterprise — `src/pages/enterprise.astro`

- **Answer-first opening** (line 127): 54-word lead — "P31's Loom gives
  your AI agents an audit trail you can verify yourself…" (in-band).
- **Attribution corrected** (lines 130–139): the old unlinked "IDC reports
  … 60% … 35%" claim is now the IDC 2026 blog "The Audit Trail That Doesn't
  Exist" (linked) + the Agentic AI Institute 2026 survey for the 60%/35%
  figures (linked via ViviScape). The $1.68B→$8.62B / 38.69% CAGR market
  forecast is re-attributed from "IDC" to its real publisher, Mordor
  Intelligence (linked) — honesty rails: no made-up attribution.
- **Expert quote** (line 169): "Agent governance is a different failure
  mode, because the record of what happened often doesn't exist at all." —
  IDC, *The Audit Trail That Doesn't Exist* (2026), verbatim, linked.
- **Sourced stats block** (line 176): all three external stats carry
  inline source links (survey, Mordor, Gartner $80B).
- **Our numbers** (line 205): "The registry behind command #2 is ours — 44
  servers registered, 22 live, 135 tools (live endpoint, as of 2026-10-13)."
- Gap cards (60%/35%/$1.68B→$8.62B) reworded to match their sources.

## 4. /research — `src/pages/research.astro`

- **Answer-first opening** (line 59): 54-word lead — "P31's research is 22
  open-access papers on Zenodo…" (in-band).
- **Expert quote** (line 63): "The optimal architecture for both biological
  and digital cognitive systems is not zero-dependency isolation but loosely
  coupled autonomy…" — William R. Johnson, Paper III, verbatim from the
  repo's own PDF, cited by DOI 10.5281/zenodo.19416491.
- **Our numbers, marked ours** (line 72): Zenodo views/downloads for the
  founding paper, imported from `ground-truth/content/stats.json`
  ("counted live from the Zenodo API", as of the last build 2026-10-13).
- The existing 22-paper card grid already renders title + DOI per card
  (`ResearchCard.astro`) — named-reference requirement met at the listing.

## 5. /faq — `src/pages/faq.astro`

- **Answer-first opening** (line 73): 57-word lead — "Yes — P31 is real,
  open, and verifiable…" (in-band).
- **Per-category answer-first ledes** (lines 22–42): each of the 5
  categories (stack 61w, family 46w, nonprofit 44w, commercial 42w,
  community 40w — all in the 40–75 band) opens with the direct answer
  rendered under its h2 (line ~93).
- Our registry numbers marked ours: "(our live registry, as of
  2026-10-13)".
- FAQPage JSON-LD left as-is (hygiene only).

## 6. Supporting changes

- `src/components/marketing/QuoteBlock.astro` (new): blockquote + cite +
  figcaption composition; honesty note in the header — only verbatim,
  verifiable quotes allowed; paraphrases stay in unquoted prose.
- `src/data/p31-mesh-constants.json`: 5 new source URLs registered
  (gartnerSovereignCloudIaaS2026Url, idcAuditTrailBlogUrl,
  mordorAgentObservabilityUrl, fullerTrimTabSourceUrl,
  agenticAiInstituteSurveyUrl) so the verify-content-consistency URL gate
  stays green.

## Honesty rails applied

- No invented experts: quotes are from the repo's own papers (William R.
  Johnson, ORCID 0009-0002-2492-9079, P31 Labs — the papers' actual author)
  or public figures with a source link (Buckminster Fuller via The
  Marginalian; IDC via its own blog).
- No fabricated quotes: all quoted text extracted verbatim from the repo's
  two hosted PDFs (PyPDF2 extraction of
  `public/papers/sovereign-stack-paper-xii-v2.pdf` and
  `public/papers/consciousness-memory-architecture.pdf`) or from the cited
  web sources.
- No made-up stats: every external number carries an inline source link;
  every internal number is marked ours ("our live registry", "as of
  2026-10-13") and traces to `ground-truth/content/` (registry-stats.json,
  stats.json, p31-research.ts, flagships.ts).
- Everything written at 5th-grade plain language; the four page leads and
  five FAQ ledes were word-counted into the 40–75 band.

## Gate results (2026-10-13)

- `npm run prebuild`: all legs green — no-HTML-comments (0 hits),
  ground-truth OK, content freshness OK, content consistency OK (38 pages),
  compliance mapping in sync, check-neurodivergent clean, WCAG static clean.
- `npm run build` (×2): 39 pages, green.
- postbuild: `check-neurodivergent --dist` green (H1→H2→H3, no skips,
  ≤3 levels on every rendered page) + `verify-wcag22 --runtime` green
  (focus-not-obscured, target size, 0 console errors).
- Spot check (Playwright vs `astro preview`): /about, /enterprise,
  /research, /faq all HTTP 200, correct h1, blockquote counts 2/1/1/0,
  0 console errors each.
- /treasury footer byte-identical to live except Cloudflare's edge
  email-obfuscation (expected).
- Portal-wide plain-language-scan + check-cognitive-load only scan
  portals/mcp-marketplace (not touched this wave) — unaffected.

## Follow-ups filed (not this wave)

- The chrome `Footer` composition's static copy says "501(c)(3) application
  pending" while nonprofit ground truth + hub pages say determined
  (2026-09-23). Fix belongs to `@p31ca/ui` (shared across 4 apps) — out of
  this wave's allowed scope (apps/p31ca only). Footer intentionally left
  identical to live per mandate.
- `/about` mermaid stackDiagram still says "36 MCP tools" (stale vs the
  live registry's 135) — pre-existing diagram, noted for the next content
  refresh.