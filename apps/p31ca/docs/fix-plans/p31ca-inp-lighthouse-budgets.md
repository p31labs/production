<!-- P31-HEADER
id: p31_fix_plan_p31ca_inp_lighthouse_budgets_20261013_v1.0
type: fix-plan
component: apps/p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: p31ca.org INP + Lighthouse performance budgets (P0)

**Discovered by:** agent:subagent:inp-lighthouse-budgets (P0 wave, Lane B hub;
queued in STATE.md 2026-10-13 after the "$5 stack" wave closed)
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** P0 — the hub's locked positioning doc rows 7 ("Performance") and
the a11y gates demand measurable performance rails.

## The gaps

1. **No performance budget config.** `docs/STRATEGIC-POSITIONING.md` locks
   "Lighthouse budgets LCP≤2.5s INP≤200ms CLS≤0.1" as a TODO, but no
   `lighthouserc.json`, no budget gate script, no `verify:perf` script exists
   anywhere in the repo. The sentence is prose, not a sensor — a Law 7
   violation (prose is advice; sensors are enforcement).
2. **Long-running interaction handlers (INP).** The topbar act menus, the
   Journey dropdown, the spoons controls, and the LED instrument's preset /
   LUMI / spoon handlers all mutate store + DOM synchronously inside the
   click/keydown/hover handler — the panel render and shell re-render happen
   in the same task as the input. No `scheduler.yield()` anywhere in the
   source (verified: zero hits for `scheduler|yield` in `src/`).
3. **Interleaved knob DOM read/write.** The scene-knob pipeline
   (`sceneStore.readSceneFromCss`) called `getComputedStyle` once PER knob
   token — six forced style recalcs interleaved with the store writes.
   `MolecularHeart`'s theme color readers did the same (4 recalcs per read
   site, 3 sites). Each `getComputedStyle` forces a layout/style flush.
4. **Stale `loomVerifyUrl`** (carried from `p31ca-five-dollar-stack.md`,
   finding 1): `src/data/p31-mesh-constants.json` points at
   `https://b30e37b5.loom-8z0.pages.dev/api/loom-public/verify` — HTTP 404
   live. The working surface is the `loom-verify` Pages project.
5. **Paper-count drift** (carried from `p31ca-five-dollar-stack.md`,
   finding 2): the strategy proof block says "23 DOI-verified papers";
   `src/data/p31-research.ts` contains 22. The drift also leaked onto live
   FAQ surfaces (is-p31-a-nonprofit, what-is-tetrahedron-protocol,
   what-is-the-care-economy, how-do-i-contribute).

## The fix

- `lighthouserc.json` at the app root — Lighthouse CI budgets: performance
  score ≥ 0.9, FCP ≤ 1800 ms, LCP ≤ 2500 ms, TTFB ≤ 800 ms, TBT ≤ 200 ms,
  CLS ≤ 0.1. INP (≤ 200 ms) is field/timespan-only — Lighthouse navigation
  runs never emit `interaction-to-next-paint`, so INP lives in the script's
  budgets (judged whenever a timespan report is supplied), documented here.
- `scripts/lh-budget.mjs` — plain Node, zero deps. Evaluates a Lighthouse
  JSON report (or runs the locally installed Lighthouse CLI if present)
  against the budgets; refuses to run if `lighthouserc.json` drifts from the
  canonical numbers. Wired as `verify:perf`.
- `src/lib/yieldToMain.ts` — `scheduler.yield()` with a `setTimeout(0)`
  fallback; applied to the topbar act-menu open/close, Journey toggle,
  spoons handlers (topbar + LED instrument), theme cycle, and the LED
  instrument's preset / LUMI / scene-preset handlers.
- Knob batching: `sceneStore.readSceneFromCss` reads one computed style into
  a local array, then writes once; `MolecularHeart` color readers collapsed
  from 12 recalcs across 3 sites to 1 batched read per site.
- `loomVerifyUrl` → `https://loom-verify.pages.dev` (the working public
  surface); consumers checked (none outside the registry itself).
- Paper count corrected to 22 in the strategy proof block and the four live
  FAQ surfaces. The marketplace playground form is out of scope — it does not
  live under `apps/p31ca` (skipped per scope rule).

## Evidence (resolved)

### Budgets shipped

- `lighthouserc.json` (app root, new) — Lighthouse CI: performance ≥ 0.9,
  FCP ≤ 1800 ms, LCP ≤ 2500 ms, TTFB ≤ 800 ms, TBT ≤ 200 ms, CLS ≤ 0.1.
  INP (≤ 200 ms) is field/timespan-only — a navigation run never emits
  `interaction-to-next-paint`, so INP is asserted by the script whenever a
  timespan report is supplied (documented in `scripts/lh-budget.mjs`).
- `scripts/lh-budget.mjs` (new) — plain Node, zero deps. Three modes: (1)
  `--json <report>` evaluates any Lighthouse report (CLI JSON, `{lhr}` API
  shape, or an array of runs); (2) no args runs the locally installed
  Lighthouse CLI when present (prefers the package's `cli/index.js` — pnpm
  `.bin` shims are shell scripts); (3) neither → exit 2 with the exact
  command to produce a report. Drift guard: refuses to run if
  `lighthouserc.json` assertions disagree with the canonical budgets, so CI
  and the local gate cannot drift silently. Exit 0 pass / 1 over budget /
  2 unmeasurable.
- `package.json` — `verify:perf`: `node scripts/lh-budget.mjs` (wired for the
  gate chain).

### Real measured numbers (2026-10-13, live p31ca.org)

Lighthouse 13.5 · Chromium 150 (headless, software WebGL) · desktop preset,
one run each. Full reports kept in `.lh/lh-live-p31ca-2026-10-13.json`.

| Metric | Budget | Measured | Verdict |
|---|---|---|---|
| FCP | ≤ 1800 ms | 928 ms | PASS |
| LCP | ≤ 2500 ms | 1005 ms | PASS |
| TTFB | ≤ 800 ms | 27 ms | PASS |
| TBT | ≤ 200 ms | 38 680 ms | FAIL — filed, not lowered |
| CLS | ≤ 0.1 | 0.000 | PASS |
| INP | ≤ 200 ms | not measured (navigation mode) | — |
| Performance score | ≥ 0.9 | 0.64 | FAIL — filed, not lowered |

For the record, the default mobile-emulation run (4× CPU throttle) measured
FCP 4316 ms, LCP 5699 ms, TTFB 79 ms, TBT 143 786 ms, CLS 0.000, score 0.35
— the desktop run above is the rc-configured preset. Budgets were NOT
lowered; both failures are filed below with the real values.

### INP handler yields (`scheduler.yield()` + `setTimeout(0)` fallback)

- `src/lib/yieldToMain.ts` (new) — the helper.
- `src/components/islands/CanonTopbar.tsx` — `setSpoons` (`:110-118`),
  `handleThemeCycle` (`:120-128`), new `openMenu` (`:131-135`), hover-open
  timer (`:137-141`), act-trigger click + focus (`:239-241`), overflow
  toggle (`:288`).
- `src/components/islands/JourneyNav.tsx` — journey toggle (`:78-80`).
- `src/components/LedController.tsx` — LUMI `runScene` (`:167-170`), LED
  preset bank (`:309-317`), scene preset chips (`:400-404`), SPOONS → 3
  (`:512`).
- Playground form submit — SKIPPED: it does not live under `apps/p31ca`
  (marketplace portal, out of scope per the scope rule).

### Knob read/write batching

- `src/stores/sceneStore.ts` — `readSceneFromCss` (`:41-70`) now does ONE
  `getComputedStyle` (each call forces a style recalc), reads the six scene
  tokens into a local array, then writes the assembled object once. Was one
  computed-style call per knob token.
- `src/components/background/MolecularHeart.tsx` — `heartColorsOf`
  (`:187-202`) batches the four role reads into one computed style; the
  three call sites (uniforms init `:203-216`, point light `:404`, theme
  MutationObserver `:448-455`) each do one read instead of two/three.

### The two hub findings — CLOSED

1. `loomVerifyUrl` → `https://loom-verify.pages.dev`
   (`src/data/p31-mesh-constants.json:46`). Consumer sweep:
   - `src/pages/enterprise.astro:174` — code block pointed at the 404
     `b30e37b5.loom-8z0` URL → now the live public endpoint.
   - `src/content/faq/how-do-you-verify.md:7` — same stale URL → fixed.
   - `src/pages/hire.astro:64` — linked the Access-gated
     `loom.p31ca.org/api/loom-public/verify` (302 → Cloudflare Access
     login) as "live proof" → now the public loom-verify endpoint.
   - `src/data/p31-compliance-mapping.ts:123` `LOOM_STABLE_URL` — kept as
     is: the compliance page already documents that URL as behind
     Cloudflare Access (an honest stated gap, not a broken link).
   - Verified live: `loom-verify.pages.dev/api/loom/verify` → 200 (public),
     `loom.p31ca.org/api/loom/verify` → 200 (public; flagships.ts links are
     fine), old `b30e37b5.loom-8z0` → 404.
2. Paper-count drift → corrected to 22 (the `papers.length` truth from
   `src/data/p31-research.ts`): `docs/STRATEGIC-POSITIONING.md:24`, plus the
   live FAQ surfaces that had repeated the wrong number —
   `src/content/faq/is-p31-a-nonprofit.md:7`, `what-is-tetrahedron-protocol.md:7`
   ("21 more — 22 total"), `what-is-the-care-economy.md:7`,
   `how-do-i-contribute.md:3`. Home page already used `papers.length`.

### Gate results (2026-10-13)

- `npm run prebuild` — green on all legs (no-html-comments, ground-truth,
  content freshness, content consistency 38 pages, compliance drift,
  neurodivergent, WCAG static).
- `npm run build` — 39 pages; postbuild `check-neurodivergent --dist` +
  `verify-wcag22 --runtime` green.
- `verify:perf` — runs, prints the per-metric table, fails honestly on the
  two over-budget metrics (exit 1); no-CLI path exits 2 with the
  produce-a-report instructions; `--json` offline path reproduces the same
  verdicts.

### Deploy + live evidence (2026-10-13)

- Deploy — `npm run deploy` green, deployment `bdac763e.p31ca.pages.dev`,
  live at p31ca.org.
- `/sovereign-vs-saas`, `/verify`, `/runbook`, `/research` — all 200.
- Live FAQ HTML carries "22 DOI-verified papers" ×3 + "21 more" + "22
  papers" ×2; enterprise + hire + FAQ serve the working loom-verify URL.
- INP helper live: `/_astro/yieldToMain.jp-VjRDY.js` (contains the
  `scheduler` yield) is imported by the served `CanonTopbar.*.js` and
  `LedController.*.js` chunks (byte-identical to `dist/`).
- e2e — `e2e/five-dollar-stack.spec.ts` 5/5 green against p31ca.org, zero
  console errors on all four surfaces (the console-clean sniffer).

### Follow-ups filed (not silently lowered)

1. **TBT 38 680 ms vs 200 ms budget + score 0.64 vs 0.9.** Root-cause
   evidence: `audits.mainthread-work-breakdown` 43 645 ms, 20 long tasks
   totaling 18 163 ms; `MolecularHeart` (the Three.js dome) mounts on every
   marketing page (`src/layouts/MarketingShell.astro:140`,
   `client:only="react"` + `transition:persist`) with a perpetual rAF +
   shader loop. Headless software-WebGL inflates the number vs real GPUs,
   but the structure (a full-scene render loop on every page) is the real
   driver. The fix is already queued: STRATEGIC-POSITIONING row 7 island
   directive audit (idle/visible for non-critical) — budgets now exist as
   sensors to prove it.
2. **Stale e2e specs** — `e2e/hub-smoke.spec.ts` (5 failures) and
   `e2e/prod-smoke.spec.ts` (4 failures) reference routes retired before
   this wave (`/p31-canon-demo`, `/initial-build.html`, `/messaging-hub`,
   `/build`, `/hiring`, `/messages` — absent from `src/pages/` and 404
   live). The failures are pre-existing and orthogonal to this wave's
   changes (verified: 404s, not topbar/INP regressions). Filed for the
   spec-ownership pass.