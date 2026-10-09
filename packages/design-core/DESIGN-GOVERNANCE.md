# DESIGN GOVERNANCE — token canon decisions (2026-09-28)

This file records the *decisions*, not the code. Every entry here resolved a
conflict that had no machine gate to arbitrate it — the class of failure the
`canon-purity` gate now blocks. If you are changing a value in `tokens.css`,
`canon.css`, `recipes.css`, or `manifest.json`, the change belongs here first.

## D-1 · Neutral hue is 270, not 240

**Status:** resolved — 270 is canonical.

**Conflict:** the canon baseline
(`packages/canon/baseline/design-core-css/tokens.css`, captured at `30846bef`)
uses hue **240** for `--p31-bg`, `--p31-surface`, `--p31-surface2`,
`--p31-text`, `--p31-text-secondary`, `--p31-text-tertiary`. The design portal's
hand-tuned local `tokens.css` — the polished visual authority — uses hue **270**
(`--p31-surface: oklch(0.14 0.008 270)`, `--p31-text-primary: oklch(0.96 0.005 270)`,
crisis/calm overlays `oklch(0.03 0 270)`).

**Resolution:** 270 is the evolved neutral family. The baseline's 240 is the
pre-perfection default. The design portal is the visual canon
(per user: "the perfected the look on the design portal"). The baseline is
kept in git history for reference; it is not re-canonicalised.

**Consequence for other blocks:** brand / dark-mode / light-theme / portal-glow
blocks have **no design-portal override**, so their values come from the baseline
(see D-2).

## D-2 · Brand / dark / light / portal-glow values come from the baseline

**Status:** resolved.

The NaN corruption erased values in `[data-brand="willow"]`,
`[data-dark-mode="true"]`, `[data-theme="light"]`, and all seven
`[data-portal="*"]` blocks. The design portal defines no local override for any
of these, so the intended values are the baseline's:

- willow glass: warm cream `rgba(255, 248, 240, 0.7)` / `rgba(200, 180, 160, 0.25)`; text hue 80.
- dark mode: warm dark `rgba(30, 28, 26, 0.8)` / `rgba(80, 75, 70, 0.3)`; text hue 80.
- light theme: real hex `#F8FAFC` `#FFFFFF` `#F1F5F9` `#0F172A` + rgba text/glass.
- portal glow: plain `rgba(<accent>, 0.08)`; research/quantum/passport use violet `139, 92, 246`.

## D-3 · The NaN corruption — root cause and gate

**Root cause:** `scripts/migrate-oklch.mjs` converted hex/rgba → oklch and
emitted `oklch(NaN NaN NaN)` wherever it could not parse a value. It never
threw. The generator (`gen-tokens.mts`) then baked the NaN into every derived
artifact. 390 literals across the tree; 90 shipped live to `design.p31ca.org`.

**Why it was invisible:** no gate compared `tokens.css` against a clean source.
The design portal's 158-line hand-tuned local `tokens.css` was compensation for
a canon that could not be trusted — the fork was a symptom, not a preference.

**Gate:** `scripts/canon-purity.mjs` fails any build containing `oklch(NaN NaN NaN)`
and verifies the governance palette resolves. Wired into `gen:tokens`, `gate`,
and the vendor `sync-vendor.mjs` path.

## D-4 · The vendor-tarball rename bug

**Root cause:** `sync-vendor.mjs` `pnpm pack` emits `p31ca-design-core-*.tgz`
(from `@p31ca/design-core`) but the consumer pins
`file:vendor/p31-design-core-3.0.0.tgz`. The sha512 check read the stale
old-name tarball, so a fresh canon never reached the portal. Silent, weeks old.

**Gate:** `renamePack()` now renames the fresh pack to the pinned filename
before the hash check. The `canon-purity` gate runs first.

## D-5 · Undefined `GOVERNANCE` palette

**Root cause:** `math/colors.ts` defined `COLORS`, `GLASS`, `STARFIELD` but not
`GOVERNANCE`, which all seven `@p31ca/governance` components import.
`@p31ca/governance@0.1.0` shipped uncompilable and unconsumed.

**Gate:** `GOVERNANCE` now defined (chainVerified/Pending/Broken, agentAccent,
agentSurface, statusObserve/Enforce/Off) + `DENSITY`/`densityForSpoons`/
`DensityLevel`; `canon-purity` checks the palette resolves; governance pkg
typechecks + tests green.

## D-6 · Baseline snapshots will shift after the NaN fix

**Status:** expected — the fix is the canon actually rendering.

Glass shadows, warm brand/dark palettes, and light-theme hex now apply where the
browser previously dropped `oklch(NaN)` declarations. The Playwright visual
baselines (`tests/visual.spec.ts-snapshots/*.png`, 39 files) and
`test-results/preflight/*.png` are captured from the previous build and WILL
diff. Regenerate intentionally and review once; record the approval here.