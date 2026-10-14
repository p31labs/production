<!-- P31-HEADER
id: p31_fix_plan_x402_facilitator_type_skew_20261011_v1.0
type: fix-plan
component: workers/mcp-x402-gateway
status: open
retention: archive-90d
created: 2026-10-11T00:00:00Z
owner: will
-->

# fix-plan: x402 facilitator type skew — @x402/core@2.15 vs x402-hono@1.2

## Symptom

`workers/mcp-x402-gateway/src/index.ts` required a local `facilitatorV1()`
cast: `@x402/core@2.15.0`'s `FacilitatorConfig.createAuthHeaders` returns
`{ verify, settle, supported, bazaar? }` while `x402-hono@1.2.0`'s
`CreateHeaders` expects `{ verify, settle, supported, list? }` (required).
Without the cast, `tsc --noEmit` failed (fixed 2026-10-11 by the x402
workstream).

## Assessment

The cast is a correct local workaround (the fields are structurally
compatible at runtime). The durable fix is a dependency alignment: upgrade
`x402-hono` to an `@x402/hono` v2-compatible release that matches the
`@x402/core` v2 surface.

## Fix

1. Upgrade `x402-hono` → `@x402/hono` (v2-compatible) in the gateway worker.
2. Remove the `facilitatorV1()` cast and use the v2 `createAuthHeaders`
   directly.
3. `npx tsc --noEmit` green + `wrangler deploy --dry-run` bundles.

## Not blocking

The gateway LOVE path (CBS settlement) does not depend on the facilitator
headers; this is type hygiene on the x402 v1 payment path.