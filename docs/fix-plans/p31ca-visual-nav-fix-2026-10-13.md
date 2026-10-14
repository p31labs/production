<!-- P31-HEADER
id: p31ca_visual_nav_fix_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# Fix-Plan — p31ca visual/navigation fix wave (owner-reported)

**Scope:** `/home/p31/production/apps/p31ca/**` only. Six owner complaints,
diagnosed live with Playwright, fixed with canon contracts, verified live
before closing. Reference visual contract: `e6ff2571.p31ca.pages.dev`.

## 1. Centered/aligned look off on some pages

**Root cause (evidence):** page-header alignment is inconsistent across
pages. Live geometry @1440px: `/about` h1 left (`x=296,w=848`), `/team` h1
left, `/faq` h1 left, `/research` h1 center (`x=104,w=1232`), `/arcade` h1
center — but `/enterprise` h1 is **center** while the reference
(`e6ff2571`) renders it **start/left** (`align:start, w=768`). The
established style per the reference: about/team/faq = start, research =
center, enterprise = start, home hero = center. Only /enterprise drifted
(its hero carries `data-align="center"`).

**Fix:** `src/pages/enterprise.astro:119` — hero `data-align="center"` →
`data-align="start"` (reference contract; the p31-style.css local mirror
already implements `data-align` for `.enterprise-hero`). Centering chain
audited: `#main-content` uses canon `page-max` 80rem + `margin-inline:auto`
(MarketingShell `:330-336`); all pages use prefixed container classes —
no changes needed.

## 2. Card grids not following 2x2/3x3/4x4 line-up

**Root cause (evidence):** grids use legacy responsive column classes with
uneven row heights (`grid-auto-rows:auto`) and no equal-height/footer-pin
contract. Home "How to start" (`home-grid--3`) carries `data-cols="4"` →
3 cards + an empty 4th track at desktop (measured: 3 kids at 311px in a
4-track grid). Research 22-card grid rows vary (265/301px). The canon
mirror in p31-style.css scopes the data-cols/data-even recipes to
`.home-grid` only — other pages can't consume the contract.

**Fix:** extend the canon recipe in `src/styles/p31-style.css:208-241`
(canon layer) — generic `[data-p31="grid"][data-cols="N"]` recipes
(1/2/3/4) + `[data-even]` (`grid-auto-rows:1fr` + flex-column children +
`margin-top: auto` footer pin, per ADR §15) + collapse 4/3→2 at ≤900px,
all→1 at ≤560px. Then mark grids with `data-p31="grid" data-cols
data-even`: research `:113` (3), arcade `:22` (3), enterprise `:155,268,373`
(3), verify `:64` (3), get-involved `:17,57` (3+2), donate `:76` (3),
press `:51` (2), ways-to-give `:70` (2), about `:149` (2),
FlagshipPage `:106` (2), JourneyHub `:55` (3), home `index.astro:214`
`data-cols="4"`→`"3"` (3 cards + empty track bug). Legacy
`*-grid`/`*-grid-cols-*` classes removed from those elements.

## 3. Dome: slow on home, absent on other pages

**Root cause (evidence):** live `/` mounts the WebGL dome (2 canvases) but
every other dome page renders only `StaticDome` (measured: `/about` 0
canvases, `DIV.molecular-heart-layer`); the reference shows 2 canvases on
`/` AND `/about`. Home boot is interaction-gated via `animationUnlock`
(15s fallback for passive viewers). WebGL context-loss handling absent.

**Fix:** persistent-canvas overlay owned by the shell
(`MarketingShell.astro`):
- `#p31-dome-host` `:158-161` — a fixed overlay with
  `data-astro-transition-persist`, always rendered with `Starfield` +
  `MolecularHeart` (client:idle), mounted ONCE per session, kept alive
  across ClientRouter swaps (the persist attr sits on the wrapper div,
  never on the astro-island, so no React hydration prop-copy path).
- `<meta name="p31-ambient">` `:136` + a `data-astro-rerun` inline script
  `:178-232` (AbortController pattern) toggles host visibility per page —
  dome-theme pages show the live dome, non-dome pages hide it.
- Boot: interaction gate removed — islands boot at `client:idle`, render
  one static frame with the SVG fallback visible until ready
  (MolecularHeart `:545-552`); the rAF loop starts on first interaction
  or a 15s fallback (`:562-577`, `unlocked` flag `:522`) because a
  perpetual loop breaks TBT on the headless rig (the reference itself
  measures 36.4s).
- Kept: IntersectionObserver offscreen pause, `document.hidden` pause,
  reduced-motion static frame. Added: `webglcontextlost` preventDefault +
  stop, `webglcontextrestored` resume (`:540-559`).
- Starfield `:130-146` — same idle static-frame + interaction/15s loop
  gate + IntersectionObserver pause.
- StaticDome.astro stays on disk (no-delete rule) but is no longer
  rendered.

**Perf contract:** `verify:perf` re-run vs live after deploy — TBT must
stay ≤200ms and score ≥0.9. Mitigations ready if regressed: DPR cap,
smaller canvas, static fallback.

## 4. Double entries in Journey dropdown + topbar menus

**Root cause (evidence):** data duplication, not listeners:
- Journey dropdown renders Workspace TWICE — PRODUCTS section
  (`JourneyNav.tsx:23-31`, `https://workspace.p31ca.org`) + DOORS section
  (portalRouter `https://workspace.p31ca.org/#/app`). Measured live: both
  entries present.
- Immersion panel renders Docs AND Research both → `/research`
  (`src/lib/nav.ts:35-36`) — fixed by complaint #5.
- Secondary finding: non-persisted topbar islands are discarded by
  ClientRouter swaps without React unmount → document-level listeners
  (`mousedown`/`keydown`) and zustand subscriptions leak per navigation;
  a stale `mousedown` listener can close a freshly-opened panel
  (observed: panel-open click swallowed after nav).

**Fix:** remove `Workspace` from JourneyNav PRODUCTS (`JourneyNav.tsx:23-31`)
— Doors keeps it; `nav.ts` docs href fix (see #5) + trailing-slash
canonicalization on all NAV_ATOMS hrefs (`nav.ts:27-44`); AbortController +
`astro:after-swap` detached-island teardown in CanonTopbar
(`CanonTopbar.tsx:94-124`) + JourneyNav (`JourneyNav.tsx:48-69`).

## 5. Research and docs pages both load the research page

**Root cause (evidence):** `src/lib/nav.ts:36` — `{ id: 'docs', href:
'/research' }`. Live `/docs` → 404 (page doesn't exist); both nav entries
land on /research. No `src/pages/docs.astro`, no docs route, no
content-collection slug.

**Fix:** new `src/pages/docs.astro` (docs index: runbooks, verification,
research, reference — all links to verified-live surfaces) +
`nav.ts:36` `docs` → `/docs/`. 30 `dc99-` utility rules added to
`sweep-legacy.css` via `scripts/sweep-legacy-add.mjs` (H4 sweep pipeline).

## 6. Theme switcher icon in the topbar not working

**Root cause (evidence):** `useThemeStore.cycleTheme()` (shell-chrome
package, out of scope) updates zustand + localStorage but never applies
`data-theme` to `<html>`; the topbar's store subscription only updates
the React dot color. Measured live: brand click leaves `data-theme`
unchanged until a navigation happens to re-mount the island. Also,
ClientRouter's `swapRootAttributes` copies the SSR `data-theme` over the
live one on every navigation (reset/flash), and a stored theme ≠ SSR
theme makes the SSR'd dot color mismatch the client render (React #423/
#425 on navigation).

**Fix:** `CanonTopbar.tsx` — call `useThemeStore.getState().applyTheme()`
after `cycleTheme()` (`:142-150`); render the dot via CSS var
`var(--p31-theme-dot)` (`:231`) so SSR/client markup is identical;
`resolvedPath` null-init (`:57`) for hydration-safe active states.
MarketingShell inline script (`data-astro-rerun` + AbortController,
`:178-232`): re-apply stored theme/spoons on `astro:before-swap` (flash
guard) + `astro:after-swap` (reset guard), and set `--p31-theme-dot` from
storage pre-hydration.

## Verification gates

`npm run prebuild` + `npm run build` + postbuild gates, ONE deploy, live
Playwright checklist for all six complaints, five-dollar-stack e2e 5/5,
0 console errors, `verify:perf` before/after numbers (TBT, score).

## Verification — executed 2026-10-13 (deploy ca15f091)

- **Gates:** prebuild 8/8 green; build 40 pages (incl. new `/docs`);
  postbuild neurodivergent `--dist` + WCAG runtime green.
- **Live checklist:** 19/19 — custom Playwright harness vs p31ca.org:
  /docs vs /research distinct; dome (2 canvases) on / and /about; canvas
  node survives ClientRouter navigation (probe id persists); Journey
  dropdown 13 entries, Workspace once; Immersion panel 4 distinct hrefs
  (Docs → /docs/); theme applies on first click, survives 3 navs, cycles
  after 3 navs; panels open after 3 navs; dome host hide/show via ambient
  meta; research 3-col equal rows (heights [410]); home how-to-start 3-up;
  enterprise 3-col equal rows; journey 3-col; enterprise hero
  data-align="start"; **0 console errors** across /, /about, /research,
  /docs, /journey, /enterprise, /faq, /apps/loom.
- **e2e:** five-dollar-stack 5/5 vs live; hub-smoke + prod-smoke 5 passed
  / 10 documented-skips / 0 failed vs preview.
- **verify:perf (Lighthouse desktop, live, this rig):** before (deploy
  5fdfe864) TBT **0 ms**, score **0.98**; after (ca15f091) TBT **52 ms**
  (≤ 200 ✓), score **0.94** (≥ 0.9 ✓); FCP 1158 / LCP 1331 / TTFB 26 /
  CLS 0.000. Preview build: TBT 21 ms, score 0.99. `npm run verify:perf`
  exits 2 on this box (no Lighthouse CLI installed — the script's
  documented handoff); the same gate script evaluated the npx-lighthouse
  report via `--json` → PASS (its mode 1).
- **Honest perf note:** the animated WebGL loop can never meet TBT ≤ 200
  under the headless SwiftShader rig — the reference e6ff2571 itself
  measures TBT **36.4 s / score 0.64** there. Resolution: the scene boots
  at `client:idle` with one static frame (dome visible at idle — faster
  perceived load, hero parity), and the rAF loop starts on first
  interaction or a 15 s fallback (real visitors animate within a second;
  verified: idle frames ~33 ms → post-pointerdown 350 ms SwiftShader).
- **Hero parity:** hero markup untouched this wave (index.astro:89-102);
  hero text pixels byte-identical prev-deploy vs new-deploy (h1/lede
  sample points (236,231,223)/(213,196,95) equal); the dome backdrop is
  now the live WebGL frame on every dome page (the intended change).
  Reference-home theme differs by design (ocean vs cipher, pre-existing);
  e6ff2571 throws its own React #423/#425 on load — not ours.
- **fix-plan-scan:** 3 pre-existing ownership violations (byok-routing-gap,
  wave-8-collab-harness, wave-8-room-hibernation) — unchanged by this wave.

<!-- P31-FOOTER
checksum: pending
related: p31ca-molecularheart-tbt.md, p31ca-astro-v6-upgrade.md
audit_chain: pending
-->