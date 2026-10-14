<!-- P31-HEADER
id: p31_fix_plan_p31ca_chrome_hydration_20261012_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: archive-90d
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix: p31ca.org "no dome / no LED / no ⌘K" — orphaned CSS + persist hydration

## Symptom

User reported no dome, no LED controller, no ⌘K pill on production, and a
"mashup of deployments" feel. Browser probes showed the islands WERE
server-rendered but the chrome was invisible/mispositioned and React logged
hydration errors #423/#425.

## Root causes (three, all fixed)

1. **Orphaned stylesheets** — `src/styles/global.css` and
   `src/styles/molecular-dome.css` (which carries `.command-fab`,
   `.devpanel__chip`, the dome layer styles) were imported nowhere after the
   hero-rewrite wave replaced the style chain with `p31-style.css`. Result:
   the ⌘K FAB and LED chip rendered in document flow (page-bottom position)
   instead of `position: fixed`, and the dome layers were unstyled.
   Fix: re-imported both in `MarketingShell.astro` (global → molecular-dome
   → p31-style).
2. **Hydration mismatch from `transition:persist`** — the CanonTopbar island
   (`client:load transition:persist`) kept Astro's `<!--astro:end-->` SSR
   delimiter inside the island DOM; React 19 hydration rejected it
   (#423/#425). Proven by DOM diff (JS-off vs JS-on): the only delta was
   the trailing comment. Fix: dropped `transition:persist` from
   CanonTopbar (state lives in zustand + storage, so nothing is lost).
3. **Style-block-in-island removed** — the topbar's 7.6KB `<style>` block was
   moved to `src/styles/topbar.css` (style text nodes in SSR islands are a
   hydration hazard; hygiene fix applied while diagnosing).

Also: SW cache v3 → v4 (mashup bust, prior fix-plan); persisted zustand
stores (led/scene) got `skipHydration: true` + post-paint `rehydrate()` to
keep the LED chip's server default matching the client's first render.

## Verification (Playwright, production)

- `pageerror`/console errors: **0** (was 2× #423/#425).
- `.command-fab` fixed bottom-left 20px · `.devpanel__chip` fixed
  bottom-right · `canvas.starfield` + `.molecular-heart-layer` fixed inset-0
  · `.posner-topbar` present.
- Deployed `b7fcdcc3.p31ca.pages.dev`; build green.

## Left filed

`astro check` fails on a pre-existing @astrojs/language-server × TS 7.0.2
incompatibility (non-blocking — the build itself is green).