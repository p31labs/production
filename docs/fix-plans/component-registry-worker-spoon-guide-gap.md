# fix: workers/component-registry advertises design_spoon_guide but executeTool has no case for it

<!-- P31-HEADER
id: p31_fix_plan_component_registry_worker_spoon_guide_gap_20261011_v1.0
type: fix-plan
component: workers/component-registry
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/component-registry/src/registry.js` advertises 5 tools in `TOOLS`
(including `design_spoon_guide`) but `executeTool` implements only 4 cases —
`design_list_components`, `design_get_component`, `design_get_tokens`,
`design_search` — plus a `default` fallback. A `tools/call` for
`design_spoon_guide` therefore returns
`{ error: "Unknown tool: design_spoon_guide", status: "error" }` instead of
the spoon guide. The CLI twin `cli/component-registry.js` implements the case
(`spoonGuide` levels 0-5, `cssAttribute`, `motionScaling`, `status: 'ok'`).
Discovered 2026-10-11 during the stateless protocol migration of this pair.

## What remains (exact steps)

1. Port the `design_spoon_guide` case from `cli/component-registry.js`
   `executeTool` into `workers/component-registry/src/registry.js`
   `executeTool` — keep the result shape identical to the CLI
   (`spoonGuide`, `cssAttribute`, `motionScaling`, `status: 'ok'`).
2. Verify with a live `tools/call` probe against the worker (local
   `wrangler dev` or curl to `/mcp`); the CLI twin stays the canonical
   reference for the payload shape.
3. `npx tsc --noEmit` in `workers/component-registry` stays green.

## Already done (this migration)

- None — the gap is a pre-existing data/behavior divergence, not a protocol
  issue; the protocol layer (`src/index.ts`) now dispatches `tools/call`
  correctly for any tool the registry implements.

## Evidence

- `workers/component-registry/src/registry.js` — `TOOLS` (5 entries incl.
  `design_spoon_guide`) vs `executeTool` switch (4 cases + default).
- `cli/component-registry.js` — `executeTool` `design_spoon_guide` case
  (lines 2016-2029 at migration time), the reference implementation.

## Resolution — 2026-10-12 (worker now serves the spoon guide)

The `design_spoon_guide` case from the CLI twin was ported into
`workers/component-registry/src/registry.js` `executeTool`
(`src/registry.js`, after the `design_search` case) with the result shape
identical to the CLI: `spoonGuide` (levels 0-5), `cssAttribute`
(`data-spoons="{0-5}" on <html>`), `motionScaling`, `status: 'ok'`. The
worker was redeployed in the SDK-v2 swap wave
(`08630886-5949-417e-8293-a75b9eed67c3`, 2026-10-12).

- **Evidence:** `npx tsc --noEmit` exit 0. Live probe:
  `tools/call design_spoon_guide` → 200 with
  `spoonGuide.3 === "BASELINE: Standard glass panels. Balanced density.
  Normal interaction patterns."`, `cssAttribute` and `status: 'ok'`
  present — matching the CLI payload byte-for-byte.