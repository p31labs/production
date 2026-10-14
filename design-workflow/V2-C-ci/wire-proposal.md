# V2-C-ci — CI gate wire-in proposal (C-1)

**Status: PENDING EXPLICIT HUMAN OVERRIDE (RB-SPINE-001).**
No portal file was edited, and none may be edited by an agent. This document is
a proposal only. `production/portals/design/package.json` remains untouched on
disk until a human applies the patch.

## The patch (exactly one line)

In `production/portals/design/package.json`, in the `scripts.gate` string,
insert this segment **immediately after the `pnpm build:pwa && ` segment**
(i.e. between `build:pwa` and `canon-source-audit`):

```
node /home/p31/production/design-workflow/V2-C-ci/ci-gate.mjs &&
```

## Before (current `gate` chain, verbatim)

```json
"gate": "node scripts/check-agent-readiness.mjs && node scripts/check-tier-promotion.mjs && node scripts/check-vendor-freshness.mjs && pnpm typecheck && pnpm lint && pnpm test && pnpm test:parity && pnpm build:pwa && node ../../tools/canon-audit/canon-source-audit.mjs --target /home/p31/production/portals/design/src --allow production/portals/design/src/tokens.css,production/portals/design/src/surfaces/ambient.css,production/portals/design/src/components/Topbar.tsx && pnpm v:gate"
```

## After (proposed, verbatim)

```json
"gate": "node scripts/check-agent-readiness.mjs && node scripts/check-tier-promotion.mjs && node scripts/check-vendor-freshness.mjs && pnpm typecheck && pnpm lint && pnpm test && pnpm test:parity && pnpm build:pwa && node /home/p31/production/design-workflow/V2-C-ci/ci-gate.mjs && node ../../tools/canon-audit/canon-source-audit.mjs --target /home/p31/production/portals/design/src --allow production/portals/design/src/tokens.css,production/portals/design/src/surfaces/ambient.css,production/portals/design/src/components/Topbar.tsx && pnpm v:gate"
```

## Why this position

- **After `build:pwa`:** the portal has already proven it builds, lints, tests,
  and passes its own token/contrast/tier/parity audits before the design-system
  pipeline gate runs. A green `build:pwa` first means a ci-gate failure cannot
  be blamed on a half-built portal.
- **Before `canon-source-audit`:** ci-gate validates the token pipeline
  (aggregate lanes A–D + DTCG shape + cross-target parity incl. LVGL). The
  portal's canon-source-audit then runs against a *validated* pipeline, so
  canon-derivation is checked after canon-integrity.
- **`v:gate` stays last:** the vendor-sync gate remains the final release
  check; nothing slots in after it.

## What `ci-gate.mjs` runs (zero deps, Node 24 ESM)

| Stage | Script | Failure behaviour |
|---|---|---|
| C-1 | `../run-all-gates.mjs` (v1.0 aggregate: lanes A–D, incl. inline negative controls) | non-zero exit → ci-gate FAIL → `pnpm gate` exits 1 |
| C-2 | `dtcg-shape-audit.mjs` (canon + A supplement + B breakpoints: string `$type`, aliases resolve, no live `$deprecated` consumer — design-core AGENTS.md mistake #6) | any finding → exit 1 → ci-gate FAIL |
| C-3 | `cross-target-parity.mjs` (A dist css-full/css-mobile/embedded/js/manifest ↔ merged source, bidirectional on full targets; every `P31_COLOR_*`/`P31_SPACE_*`/`P31_RADIUS_*` define in `p31_theme.h` ↔ `color-map.json` ↔ merged source) | any finding → exit 1 → ci-gate FAIL |

## Negative controls (demonstrated, all real commands)

| Control | Command | Result |
|---|---|---|
| Healthy system | `node ci-gate.mjs` | exit 0 — `RESULT: ALL CI GATES PASS` |
| Runner fail machinery | `node ci-gate.mjs --expect-fail` | exit 1 — all 3 gates FAIL (inverted expectations unmet) — proves the runner fails when a gate doesn't meet expectations |
| Planted broken token | `node ci-gate.mjs --sources .neg-tmp/nc2-broken-alias` | exit 1 — `FINDING …supplement.tokens.json:fluid.space.md — unresolved alias reference {nonexistent.token}` |

Per the runbook §8 gates table, the negative control for the design-system
aggregate gate is *"broken token → exit 1"*. Because the v1.0 aggregate runner
is frozen (reads hard-coded lane paths), the planted broken token reaches the
gate through ci-gate's `--sources` override of the C-2 audit stage — same
failure surface `pnpm gate` would see (chain short-circuits, exit 1). The
aggregate runner separately demonstrates its own inline negative controls on
every run (unresolved alias, unknown target, missing `$type`, sabotaged D
color-map, oversized budget fixtures — all expected-fail).

## RB-SPINE-001 note

`pnpm gate` is the sensor for the Seven Laws, and the portal is frozen against
agent edits. The one-line patch above is the entire change required — no
portal scripts, no deps, no installs. If a human accepts, apply the patch and
run `pnpm gate` once from `production/portals/design/`. If the portal's
`node_modules` is not intact on this box (disk at 97%), the wire-in is verified
on-chain-shape only; the full `pnpm gate` run happens wherever the portal
builds.