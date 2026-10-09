# fix: token-validation pins @design-token-kit/cli to "latest"; dtokens shim dangles

<!-- P31-HEADER
id: p31_fix_plan_token_validation_unpinned_cli_20261009_v1.0
type: fix-plan
component: tools/token-validation
status: open
retention: keep-forever
created: 2026-10-09T00:00:00Z
owner: will
-->

## Symptom

`pnpm --filter @p31ca/canon build` fails at the `gen:tokens` step:

```
Command failed: .../tools/token-validation/node_modules/.bin/dtokens check
  .../packages/design-core/tokens/tokens.dtc.json
Error: Cannot find module '.../node_modules/.pnpm/@design-token-kit+cli@1.10.0/
  node_modules/@design-token-kit/cli/bin/index.mjs'
```

Surfaced during the pnpm 12 rehearsal (2026-10-09), but it is **not**
pnpm-12-specific — it is a pre-existing fragility in the standalone
`tools/token-validation` tool.

## Evidence

`tools/token-validation/package.json` declares:

```jsonc
"dependencies": { "@design-token-kit/cli": "latest" }
```

`latest` is not a pinned version. The tool's `node_modules/.bin/dtokens` shim
(dated 2026-09-29) points at `@design-token-kit/cli@1.10.0`, which is no longer
present in the root pnpm store (`node_modules/.pnpm/@design-token-kit+cli@1.10.0`
→ No such file or directory).

`tools/token-validation` is **not** a workspace member (the root globs are
`packages/*`, `apps/*`, `workers/*`), so neither `pnpm install` on 11.x nor 12.x
re-resolves or reinstalls it. Its `node_modules` is stale, and the `"latest"`
specifier means the resolved version can drift away from whatever the shim
recorded.

## Fix

1. Pin the version: replace `"latest"` with the concrete resolved version, e.g.
   `"@design-token-kit/cli": "^1.10.0"` (or the exact version the shim expects).
2. Reinstall the tool's deps from inside `tools/token-validation/`
   (`pnpm install --ignore-workspace`), so its `dtokens` shim points at a real
   store path again.
3. Re-run `pnpm --filter @p31ca/canon build` and confirm `gen:tokens` passes.

## Impact

- Blocks `@p31ca/canon` build (and therefore its publish) on every fresh
  install, on both pnpm 11 and 12. Independent of the pnpm version decision.
- Same class of bug the SSOT arc has been eliminating: a machine-specific /
  unpinned reference that works only because of a stale local `node_modules`.