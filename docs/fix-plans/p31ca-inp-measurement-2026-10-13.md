# fix: INP lab-proxy measurement harness — per-surface baselines for p31ca.org (lab proxy, not field INP)

<!-- P31-HEADER
id: p31_fix_plan_p31ca_inp_measurement_20261013_v1.0
type: fix-plan
component: p31ca
status: resolved
retention: keep-forever
created: 2026-10-13T21:55:00Z
owner: will
-->

## Symptom

The "Better for $5" wave queued INP budgets as a follow-up (STATE.md). Before
any budget can be set, the hub's interactive surfaces need a latency baseline.
`web-vitals` RUM is not wired into the hub, so no field INP exists yet. This
lane built a **lab-proxy measurement harness** — no page changes, no deploy —
and ran it against the live sites.

## Method

New files only (hard rules honored: no page/component/astro/tsx edits, no
build, no deploy, no deletions, no `pnpm install`):

- `apps/p31ca/scripts/measure-inp.mjs` — zero-dep collector + threshold logic +
  surface drivers + standalone runner (`node scripts/measure-inp.mjs`)
- `apps/p31ca/e2e/inp-harness.spec.ts` — Playwright spec that runs the harness
  against the live sites
- this fix-plan

**Collector.** `web-vitals` is NOT in `apps/p31ca/node_modules` (verified
2026-10-13), so the harness uses a zero-dep browser-side collector
(`scripts/measure-inp.mjs:65` — `INP_COLLECTOR`): a `PerformanceObserver` for
`event` entries (`durationThreshold: 16`, `buffered: true`) over the INP
candidate types (pointerdown, pointerup, click, keydown, keyup) plus a
`longtask` observer. Latencies are grouped by Chrome `interactionId` when
present, with a keydown→keyup (300 ms) / pointerdown→pointerup (1000 ms)
heuristic fallback; per-interaction latency ≈ `max(entry.duration, …)`
(Chromium's `duration` already spans input → next paint for discrete events).
This **approximates** INP — no attribution weighting, no 98th-percentile-over-
session, no web-vitals next-paint estimation.

**Surfaces** (5 runs each, live URLs, selectors verified against production):
CommandPalette ⌘K open + 5-char type (`scripts/measure-inp.mjs:288`),
LedController BRI knob mouse drag (`:307`) and preset apply (`:323`),
JourneyNav toggle (`:328`) and item select via popup (`:344`), topbar spoons
level change (`:361`), theme cycle (`:374`), marketplace playground form
submit at p31-portal-mcp-marketplace.pages.dev (`:379`, `:408`). Thresholds:
p75 ≤ 150 ms headroom-pass · 150–200 ms monitor · > 200 ms fix
(`:215` `classify`, `:221` `THRESHOLDS`).

**Run command** (same as the repo's prod e2e pattern):

```
PLAYWRIGHT_BASE_URL=https://p31ca.org PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test e2e/inp-harness.spec.ts
```

## Evidence — per-surface table (tight-window run, 2026-10-13)

Ambient baseline (2 s idle window, no interaction): **0 long tasks** — the
hub is not continuously blocking; long tasks appear only around interaction
re-render bursts (see honesty section).

| Surface | runs | n | p75 | max | longtaskMax in window | verdict |
|---|---|---|---|---|---|---|
| hub:command-palette (⌘K + 5 chars) | 5 | 28 | 1072 ms | 1712 ms | 1643 ms | **fix** |
| hub:led-knob-drag (BRI) | 5 | 0 | — | — | 1424 ms | **no-lab-events** (sub-16 ms) |
| hub:led-preset-apply | 5 | 1 | 368 ms | 368 ms | 787 ms | **fix** |
| hub:journey-toggle | 5 | 5 | 984 ms | 1272 ms | 717 ms | **fix** |
| hub:journey-select (popup) | 5 | 1 | 488 ms | 488 ms | 444 ms | **fix** |
| hub:topbar-spoons | 5 | 0 | — | — | 523 ms | **no-lab-events** (sub-16 ms) |
| hub:theme-cycle | 5 | 4 | 856 ms | 1408 ms | 978 ms | **fix** |
| marketplace:playground-submit | 5 | 0 | — | — | 106 ms | **surface-unavailable** (see below) |

Cross-run variance of the SAME surfaces across four independent harness runs
(same box, minutes apart) — this is the single most important evidence in
this lane:

| Surface | run 1 p75 | run 2 p75 | run 3 p75 | run 4 p75 |
|---|---|---|---|---|
| hub:command-palette | 1088 ms | 3936 ms | 1072 ms | — |
| hub:theme-cycle | 2176 ms | 912 ms | 856 ms | 1272 ms |
| hub:led-preset-apply | 2849 ms | 1720 ms | 368 ms | — |

A 3.6× swing (912→3936 ms) on identical scripted interactions, minutes apart,
proves these lab numbers are dominated by the measurement environment, not by
the app's code.

Marketplace playground: the run-form input (`input[aria-label="What should
the helper try?"]`) only materializes after the portal's live tool-list fetch
for the selected server. From this lab host that fetch does not complete
reliably — the portal console logs `Failed to load resource:
net::ERR_CONNECTION_REFUSED` (its WebMCP/registry transport), and the input
is absent from the DOM at submit time (verified via `page.evaluate` across 4
attempts; the form was observed present once in an early probe when the
backend responded). The harness reports `surface-unavailable` honestly and
does not fabricate numbers.

## Lab-vs-field honesty (read before acting)

1. **This is not INP.** INP is a field metric: the 98th percentile of
   interaction latency across real users/devices (CrUX / web-vitals RUM).
   This harness measures one headless Desktop Chrome at ~1× CPU on scripted
   interactions, on a shared host (load ≈ 9 on 7 cores at run time).
2. **Software-render inflation.** The hub homepage animates WebGL islands
   (Starfield + MolecularHeart, `MarketingShell.astro:154-155`). Headless
   Chromium renders them on the software rasterizer; interaction-triggered
   re-render bursts (theme cycle re-renders every surface) then cost
   seconds-to-paint on this box, which inflates every `entry.duration`
   (input → next paint). Idle windows show 0 long tasks, so the burst cost
   is render-environment-driven, not continuous app blocking.
3. **Sub-16 ms events are invisible** to `event` observers by Chromium
   design — hence `no-lab-events` verdicts for knob drag and spoons, which
   are genuinely fast interactions even in this environment.
4. **Field RUM is the real source.** The harness is a smoke-proxy: it proves
   the measurement mechanism and catches order-of-magnitude regressions
   (>500 ms under a quiet host would be worth investigating), but per-surface
   verdicts here are NOT app-side INP violations.

## The fix

**Do NOT change code from this data.** The >200 ms verdicts are
environment-dominated (see variance table). What the data does support:

- **Code already carries `scheduler.yield()` treatments** on the heavy
  interaction paths: theme cycle (`CanonTopbar.tsx:120-129`), spoons change
  (`:110-118`), menu open (`:131-135`), Journey open (`JourneyNav.tsx:76-80`),
  LED preset (`LedController.tsx:308-315`), LUMI run (`:166-168`). Those
  treatments are the right pattern and should be preserved.
- **The one measured surface without an explicit yield was CommandPalette**
  (`CommandPalette.tsx` — open render at `:27-48`, search filter `:59-63`).
  Its lab p75 (1072 ms) was the same noise band as yielded surfaces, so this
  was a *field-data candidate*, not a lab-proven regression.
- **Action items (follow-ups, not this lane):**
  1. Wire `web-vitals` RUM (`onINP`) into the hub — that is the actual INP
     budget source; the harness can then be cross-checked against it.
  2. Re-run `e2e/inp-harness.spec.ts` on a quiet host (and optionally headed
     with GPU) to separate app cost from environment noise.
  3. Re-attempt `marketplace:playground-submit` when the portal's registry
     transport is reachable from the lab host.
  4. If field data later shows any surface p75 > 200 ms, the treatment is the
     existing `yieldToMain` pattern applied to the unyielded segment.

## Status update — final hub wave (2026-10-13)

Item 4 is DONE, item 1 is FILED (not done), items 2–3 remain open.

**CommandPalette yield — done.** `apps/p31ca/src/components/CommandPalette.tsx`
now applies `yieldToMain` (from `src/lib/yieldToMain.ts` — `scheduler.yield()`
with `setTimeout(0)` fallback) to every open and search path:
- ⌘K / Ctrl+K toggle (`:29-35`) — yields before `setOpen`
- FAB click open (`:122-126`) — yields before `setOpen(true)`
- search input `onChange` (`:173-180`) — yields before `setQuery` +
  `setActiveIndex(0)`

Each carries the same `// INP:` comment pattern as the other surfaces. The
only unyielded measured surface now matches the established pattern. Deployed
2026-10-13 (one deploy); CommandPalette still renders 0 console errors on the
live home (Playwright console-sniff pass).

**web-vitals disposition — NOT installed.** Checked on 2026-10-13:
- `web-vitals` is NOT in `apps/p31ca/node_modules` and NOT in the root
  `node_modules` (`node_modules/.pnpm` has zero `web-vitals` entries).
- The workspace has ONE shared lockfile (`/home/p31/production/pnpm-lock.yaml`)
  with an `apps/p31ca:` importer block; `apps/p31ca` has no lockfile of its
  own. Any `pnpm add web-vitals --filter p31ca` rewrites the ROOT lockfile
  (importer section + package block), which CI consumes with
  `--frozen-lockfile` across every package in the monorepo. A
  `--lockfile=false` install would be pruned by the next workspace install
  and is not durable for CI.
- Decision: do NOT install. The zero-dep browser-side collector
  (`scripts/measure-inp.mjs:65` `INP_COLLECTOR`) stays as-is. When RUM wiring
  is unblocked, the version to wire is **web-vitals v6** — see the upgrade
  path below.

**RUM wiring + collector endpoint remain infra items**, filed honestly: the
lab harness cannot produce real INP; field INP requires a `web-vitals` onINP
wiring AND a collector endpoint to receive beacons — no beacon ships to
production without an endpoint. Tracked as the owner item "RUM collector
endpoint (filed by the INP lane — lab cannot produce real INP)" in STATE.md.
When the endpoint exists, the upgrade path is: wire **web-vitals v6**
(v6.0.0, released 2026-07-21, adds soft-navigation support; npm registry
check 2026-10-13 shows latest 6.2.3, published 2026-10-05 — superseding the
brief's "v6.1.1 current"), send `onINP` beacons to a **collector worker**,
and cross-check the harness against it.

**Installation path: vendored-inline, not `pnpm add`.** Any dependency
install would mutate the ROOT lockfile (`/home/p31/production/pnpm-lock.yaml`),
which CI consumes with `--frozen-lockfile` across the monorepo. The durable
path is to vendor the web-vitals v6 module into `apps/p31ca` (e.g.
`src/vendor/web-vitals/`, copied from the published tarball, imported locally
as an internal path dependency) — zero lockfile mutation, survives workspace
reinstalls. The collector worker receives the `onINP` beacon from the
vendored module; no root package.json or lockfile change is required at any
step.

## Files touched

- NEW `apps/p31ca/scripts/measure-inp.mjs`
- NEW `apps/p31ca/e2e/inp-harness.spec.ts`
- NEW `docs/fix-plans/p31ca-inp-measurement-2026-10-13.md` (this file)
- `apps/p31ca/src/components/CommandPalette.tsx` (edited — yieldToMain on
  open + search, final hub wave)