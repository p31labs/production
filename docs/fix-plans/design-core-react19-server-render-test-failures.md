# fix: design-core vitest — 4 pre-existing React server-render failures

<!-- P31-HEADER
id: p31_fix_plan_design_core_react19_server_render_20261012_v1.0
type: fix-plan
component: packages/design-core
status: open
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

**Discovered by:** agent:subagent:wave4-device-tiers (baseline test run before
W4 work; failures pre-date this session)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (test suite not fully green; blocks confident W4 exit)

## Symptom

Baseline `vitest run` in `packages/design-core` reports 4 failures across
2 files (59/63 pass):

1. `tests/face.spec.tsx` — PortalTopbar canonical shell shape (1 test):
   `TypeError: Cannot read properties of null (reading 'useState')`,
   raised while `ThemePicker` (src/shell/ThemePicker.tsx:21) server-renders
   via react-dom-server-legacy.
2. `tests/cartridge-console.spec.tsx` — CartridgeComposer T4 wizard (3
   tests): same react-dom-server-legacy failure shape.

Both are React 19 server-render issues (`react@19.3.0` in the pnpm store;
hooks returning null when rendered through the legacy server renderer used
by these specs), not W4-related: W4 touched tokens, one new CSS file, a
zero-dep emitter script, and a non-React spec only.

## Evidence

- `packages/design-core/tests/face.spec.tsx` — PortalTopbar render test.
- `packages/design-core/tests/cartridge-console.spec.tsx` — T4 wizard
  render tests.
- Stack: `react-dom-server-legacy.node.development.js → renderWithHooks →
  exports.useState (react.development.js:1309)`.

## Not done here (out of W4 scope)

These tests exercise shell/composition rendering, not the token pipeline.
A fix belongs to the design-core owner (likely a react-dom version alignment
in the vitest setup or a shared test renderer migration), not to the
device-tier wave. Filed per the ownership contract; W4's new spec
(`tests/device-tiers.spec.ts`) is React-free and passes independently.

## Flake note (also pre-existing)

`tests/agentic/negative-control.spec.ts` and
`tests/agentic/human-anchor.spec.ts` spawn slow subprocesses (~7–8 s each)
and intermittently fail under full-suite parallelism (passed in 2 of 3 full
runs and always in isolation). Not W4-related; same root cause class as the
React failures — suite-level test-infrastructure drift. Tracked here so the
owner fixes the suite as one item.