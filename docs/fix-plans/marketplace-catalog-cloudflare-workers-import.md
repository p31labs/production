<!-- P31-HEADER
id: p31_fix_plan_catalog_workers_import_20261011_v1.0
type: fix-plan
component: workers/marketplace-catalog
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# fix-plan: marketplace-catalog-cloudflare-workers-import

**Discovered by:** agent:subagent:marketplace-frontend-upgrade (W-session)
**Discovered at:** 2026-10-11T00:00:00Z
**Severity:** medium

## The bug

`workers/marketplace-catalog/src/index.ts:8` imports
`DurableObject, DurableObjectState, DurableObjectNamespace, SqlStorage` as named
exports of `'cloudflare:workers'`. Two problems stack here:

1. **Standalone build is broken.** The catalog worker's `tsconfig.json` has no
   `"types"` entry, so `@cloudflare/workers-types` never loads and
   `'cloudflare:workers'` cannot resolve at all. `cd workers/marketplace-catalog
   && npx tsc --noEmit` fails with TS2307 + a cascade (`D1Database` not found,
   `env` not on `MarketplaceCatalogDO`, `Request.json<T>()` arity errors,
   `body` unknown). The worker only ever shipped via wrangler, which does not
   type-check.
2. **The named imports are not module exports.** Even with `"types"` loaded,
   `@cloudflare/workers-types` 5.x declares `DurableObjectState`,
   `DurableObjectNamespace`, and `SqlStorage` only as ambient globals; the
   `cloudflare:workers` module namespace exports only the runtime classes
   (`DurableObject`, `WorkerEntrypoint`, `RpcTarget`, …). So the import line
   cannot type-check against current types (verified:
   `@cloudflare/workers-types@5.20261008.1`).

## Why this surfaced now

`workers/marketplace-mcp` now imports the DO class from
`../../marketplace-catalog/src/index` (the old
`src/marketplace-catalog` symlink was dangling — see
`marketplace-mcp-do-integration-gaps.md`), which pulls the catalog source into
the MCP worker's program. marketplace-mcp works around issue 2 with a local
ambient shim (`src/types/catalog-compat.d.ts`) that re-exports the three
globals from the module. That shim is scoped to marketplace-mcp and does not
fix the catalog worker itself.

## The fix

In `workers/marketplace-catalog` (not touched by this workstream — ownership
zone):

1. Add `"types": ["@cloudflare/workers-types"]`, `"lib": ["ES2022"]`, and
   `"moduleResolution": "bundler"` to the catalog `tsconfig.json` so the
   standalone `tsc --noEmit` gate can run.
2. Change `src/index.ts:8` to import only what the module actually exports
   (`DurableObject`) and use the ambient globals
   (`DurableObjectState`, `DurableObjectNamespace`, `SqlStorage`) directly,
   or add the same ambient augmentation locally.

## The gate

`cd workers/marketplace-catalog && npx tsc --noEmit` exits 0 and
`workers/marketplace-mcp` no longer needs its compat shim (or the shim becomes
documented as redundant).