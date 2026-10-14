<!-- P31-HEADER
id: p31_fixplan_p31ca_neurodivergent_wcag_content_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T03:30:00Z
owner: wave-3 (neurodivergent-design gate, WCAG 2.2 AA verify, hero specificity, Q&A content)
-->

# p31ca — Neurodivergent Gate + WCAG 2.2 + Hero Specifics + FAQ Content (RESOLVED)

Final void-fill wave for p31ca.org. Every item below is either resolved in
this wave with evidence, or filed for the lane that owns it.

## 1. Neurodivergent-design gate — `scripts/check-neurodivergent.mjs` (RESOLVED)

Wired into prebuild (`--default` source leg) + postbuild (`--dist` rendered
leg). Rules (research-locked):

| Rule | Sensor | Status |
|---|---|---|
| (a) one filled-accent primary CTA per viewport | static: `btn btn-primary` or inline `background: var(--p31-accent)` on a/button, ≤1 per section/region; islands checked per render state | ✅ pass |
| (b) consistent layout per page-type | MANUAL item (documented, printed by the gate) | manual |
| (c) no autoplay / no flashing / reduced-motion respected | grep autoplay + `steps()` + `@media (prefers-reduced-motion)` in hub css | ✅ pass (7 reduced-motion blocks in src/styles) |
| (d) skip-to-content link | MarketingShell renders `.skip-link` → `#main-content` | ✅ pass |
| (e) predictable nav | NAV_ATOMS is the only act-atom source; CanonTopbar renders from it | ✅ pass |
| (f) plain heading hierarchy H1→H2→H3, no skips, ≤3 | src: no h4+ anywhere; postbuild `--dist`: per rendered page — first heading h1, no skips, ≤3 | ✅ pass |

Negative controls: `--self-test` plants 10 violations (two accent CTAs in one
region, two in one island render state, autoplay, `steps()` flashing, missing
reduced-motion query, missing skip link, rogue act-atom array, h4, h2→h4 skip,
h2-first page). 10/10 caught (evidence: `node scripts/check-neurodivergent.mjs --self-test`).

Real-tree violations found and fixed this wave:
- `src/pages/donate.astro`, `get-involved.astro`, `team.astro`,
  `components/marketing/Footer.astro` used `<h4>` → re-leveled (h2/h3),
  class-styled the same (no visual change).
- 18 pages opened with an h2 (`SectionHeader`) and no h1. `SectionHeader.astro`
  gained a `level` prop; page-title headers now render h1; the section
  headings under them were re-leveled h3→h2 (about, accessibility,
  annual-report, arcade, compliance, donate, faq, financials, get-involved,
  press, privacy, research, security, team, terms, treasury, ways-to-give,
  blog/index, blog/[slug]).
- Astro passes `level="1"` as the string "1" — `SectionHeader` coerces
  (`Number(level) === 1`). First attempt silently emitted h2 again; caught by
  the `--dist` leg.

## 2. WCAG 2.2 AA verification — `scripts/verify-wcag22.mjs` (RESOLVED)

Wired into prebuild (`--static` default) + postbuild (`--runtime` Playwright
against a fresh `astro preview`, chromium from the playwright browsers cache —
same resolution as the e2e suite).

Automatable results:
- **2.4.11 focus-not-obscured** — runtime: tabbed through the topbar + page;
  every focused element outside the bar sits below the sticky bar's bottom
  edge − 2px (the `--p31-header-height` 4rem + 0.5rem scroll-padding
  contract). The skip link is exempt: it is a focus-reveal overlay
  (z-index 9999 > the bar's 50). ✅
- **2.5.8 target size** — runtime: all visible topbar controls + spoons +
  home CTAs ≥24×24 computed px. FIXED: `.posner-spoon` was 20×20
  (`src/styles/topbar.css` → 24×24). ✅
- **2.5.7 dragging** — static: zero drag-only surfaces in hub src; the canon
  Split carries the keyboard fallback
  (`design-core/src/compositions/canon-v2/Split.tsx`: ArrowLeft/Right ±5%,
  Home/End snap, role="separator"). ✅
- **3.2.6 consistent help** — static: shell renders CanonTopbar (overflow:
  ThemePicker + Spoons) + CommandPalette + LedController on every route, and
  every page renders a footer (import-resolved). FIXED: 404.astro imported
  SharedFooter but never rendered it → now renders. ✅
- **3.3.7 redundant entry** — static: JourneyWizard collects the member
  once, mints the identity once, fetches session/balance once. ✅
- **3.3.8 accessible auth** — static + FIXED: signin/signup now carry
  `autocomplete="username"`, `current-password` / `new-password`
  (signup confirm: `new-password`). ✅

Negative controls: `--self-test` plants 5 (drag-only surface flagged;
drag-with-keyboard-fallback allowed; page without footer; field asked twice;
password without autocomplete). 5/5.

Manual-only checklist (printed every run): 2.4.11 visual contrast review;
3.2.6 help-order review; 2.5.8 spacing-exception review; 3.3.7 voice/OTP
alternative review.

## 3. Hero specifics line (RESOLVED)

One plain line under the live-stats strip on the home hero
(`src/pages/index.astro`, class `.home-hero__specifics` in
`src/styles/p31-style.css`):

> Post-quantum signing, hash-chained evidence logs, a design system with 32
> components, and a game arcade — all in the stack.

Every count verified before writing: ML-DSA-65 hybrid signing is live (12
crypto tools in the registry, `pqc_keygen` among them); the Loom is a
hash-chained SHA-256/RFC 8785 log; the design registry lists **32**
components (`design_list_components` total: 32 — the registry's 38 design
tools are tools, not components, so 38 was NOT used); `/arcade` hosts 6
games. Registry read at build time: 44 servers / 22 live / 135 tools.

## 4. FAQ Q&A content (RESOLVED)

All 16 entries in `src/content/faq/*.md` carry substantive plain-language
answers. Strengthened this wave with original, verified data points:
44 registry servers / 22 live / 135 tools (is-the-code-open-source,
can-i-deploy-p31, how-do-i-contribute), 23 DOI-verified papers
(is-p31-a-nonprofit, what-is-tetrahedron-protocol, what-is-the-care-economy),
100% open source + zero-telemetry (do-you-train-on-family-data),
post-quantum by default (how-is-p31-different, what-is-post-quantum),
live verify endpoint with no account needed (how-do-you-verify). Fixed a YAML
break introduced by a `lanes: code` colon-space (re-quoted). JSON-LD already
shipped — untouched.

## 5. Found-and-fixed (same wave)

- **Double topbar** on `/blog` and `/blog/mcp-marketplace`: the pages rendered
  `CanonTopbar` inside the slot while MarketingShell already owns the chrome
  (2× `role="banner"` in the built DOM). Removed the page-level render.
- **Treasury mismatched tags**: the h3→h2 re-level left two `</h3>` closers
  (`Allocation policy`, `Revenue by source`) — corrected.
- **Spoon targets 20×20** → 24×24 (2.5.8).
- **404 without footer** → SharedFooter now rendered.
- **signin/signup autocomplete** added (3.3.8).

## 6. Filed for other lanes (not hub-editable)

- **Canon `@p31ca/ui` Footer renders `<h4>` column titles**
  (`node_modules/@p31ca/ui/src/chrome/Footer.tsx:38,47` "Products" /
  "Organization"). The hub dist check strips `<footer>` chrome from the
  heading scan pending this canon fix. Lane: canon/design-core (portals).
- **Legacy static `public/*.html` pages** (agent/*, archive/*, *-about.html)
  have no H1→H2→H3 hierarchy. Out of this wave's scope (not src/pages
  routes); the `--dist` check covers only Astro-authored routes. Lane:
  legacy cleanup wave.
- **signin/signup submit stub** (`onsubmit="alert(...)"` — auth backend not
  wired). Pre-existing; the inputs are now 3.3.8-clean, the submit path
  belongs to the apps/auth deployment.
- **Manual WCAG reviews** remain on the printed checklist (visual contrast,
  help order) — human eyes each wave.
- **Runtime-leg process hygiene**: the preview server spawns the local astro
  binary directly (no npx wrapper) and kills its process group on exit — no
  stray `astro preview` processes after postbuild.

## Evidence

- `npm run prebuild` → all gates green (comment gate, ground-truth, content
  sources/consistency, compliance drift, check-neurodivergent,
  verify-wcag22 --static).
- `npm run build` → 36 pages, postbuild green
  (`check-neurodivergent --dist` + `verify-wcag22 --runtime`: 2.4.11, 2.5.8,
  console all pass), exit 0.
- Negative controls: neurodivergent 10/10, wcag 5/5.
- Deployed live; Playwright production probe: 0 errors, hero specifics line
  present, FAQ answers substantive.