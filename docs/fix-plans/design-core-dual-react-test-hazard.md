<!-- P31-HEADER
id: p31_fix_plan_design_core_dual_react_test_hazard_20261012_v1.0
type: fix-plan
component: packages/design-core
status: open
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

# fix-plan: design-core tests render with two React copies (invalid hook call)

**Discovered by:** agent:subagent:canon-v2 (the vessel-contract build)
**Discovered at:** 2026-10-12T00:00:00Z
**Severity:** medium (test-suite false failures; no production runtime impact)

## The bug

`vitest run` in `packages/design-core` resolves `react` to the workspace copy
(`node_modules/.pnpm/react@19.3.0/node_modules/react`) but `react-dom/server`
to a DIFFERENT install (`/home/p31/node_modules/react-dom`, react 19.3.0 from
the home-dir node_modules). Two React copies ⇒ every component that calls a
hook fails with "Invalid hook call … more than one copy of React".

Pre-existing failures this explains (untouched by the canon v2 work):
- `tests/face.spec.tsx` (PortalTopbar)
- `tests/cartridge-console.spec.tsx` (CartridgeConsole / CartridgeComposer)
- any new spec that renders hook components (the canon v2 family uses
  useId/useState/useRef, so `tests/canon-v2.spec.tsx` hit it immediately).

Hook-free render tests pass, which is why the suite looked green until now.

## The fix

`vitest.config.ts` now pins both `react` and `react-dom` to the PAIRED
workspace copies with `resolve.alias`, computed at config load from
`require.resolve` so it survives workspace re-links:

1. Resolve the workspace `react` entry, alias `react` to its package dir
   (keeps `react/jsx-runtime` resolving inside the same package).
2. Resolve `react-dom` from the directory next to that react copy (the
   `.pnpm/react-dom@19.3.0_react@19.3.0` pair), alias `react-dom` to its
   package dir (keeps `react-dom/server` resolving inside the same package).

With the alias, hook components render under ONE React instance and the
pre-existing face/cartridge-console failures clear.

## Still open (separate issue)

`tests/agentic/*.spec.ts` time out (5s) because they spawn the agentic CLI
(`pnpm exec tsx src/agentic/cli.ts`) on a loaded machine — unrelated to the
dual-React hazard; those tests need a longer timeout or a faster harness.
Not part of this fix.