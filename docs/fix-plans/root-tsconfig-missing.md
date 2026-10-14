# fix: root tsconfig.json is missing — packages that extend it cannot build

<!-- P31-HEADER
id: p31_fix_plan_root_tsconfig_missing_20261011_v1.0
type: fix-plan
component: workspace
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`/home/p31/production/tsconfig.json` does not exist, but at least three
package configs extend it:

- `packages/ui-mcp/tsconfig.json` (`"extends": "../../tsconfig.json"`)
- `packages/game-generator/tsconfig.json`
- `packages/interface-generator/tsconfig.json`

Running `tsc` (e.g. `pnpm build` in `packages/ui-mcp`) fails with
`File '../../tsconfig.json' not found` — the build is broken independent of
the MCP migration. Likely collateral of the SSOT token consolidation that
deleted several root files.

## Impact

- `packages/ui-mcp` cannot build/typecheck until either the root config is
  restored or its `tsconfig.json` is made standalone.
- Any CI/gate step that typechecks these packages fails.

## Suggested fix (coordinator decides)

Either:
1. Restore a minimal `/home/p31/production/tsconfig.json` base
   (target/module/moduleResolution/strict/skipLibCheck, no include), or
2. Inline the needed compilerOptions into each affected package's
   `tsconfig.json` and drop the `extends` line.

Note: `packages/ui-mcp`'s new v2 code was verified against the real
`@modelcontextprotocol/server@2.3.1` types in a scratch project
(`/tmp/opencode/v2check`) — the code is sound; only the repo-local build is
blocked by this missing file.

## Evidence

- `ls /home/p31/production/tsconfig.json` → No such file or directory.
- `packages/ui-mcp/tsconfig.json:2` — `"extends": "../../tsconfig.json"`.
- Discovered 2026-10-11 during the ui-mcp SDK v2 swap (MCP migration).

## Resolution (2026-10-11)

Created the minimal base `/home/p31/production/tsconfig.json` (ESNext /
ESNext / Bundler / strict / skipLibCheck / esModuleInterop /
resolveJsonModule / declaration; excludes node_modules + dist) matching the
worker tsconfig conventions (option 1 above).

**Verification:** `cd packages/ui-mcp && npx tsc --noEmit` → exit 0 (was 66
errors incl. TS5083 before the file existed). `game-generator` and
`interface-generator` extends chains resolve.