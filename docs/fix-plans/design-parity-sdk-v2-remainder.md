<!-- P31-HEADER
id: p31_fix_plan_design_parity_sdk_v2_remainder_20261011_v1.0
type: fix-plan
component: tools/design-parity
status: open
retention: archive-90d
created: 2026-10-11T00:00:00Z
owner: will
-->

# fix: design-parity parity-server.mjs remains hand-rolled (no SDK v2)

## Symptom

`tools/design-parity/parity-server.mjs` was migrated to the stateless
2026-07-28 protocol (2026-10-11, `design-parity-stateless-migration.md`) but
kept its hand-rolled stdio JSON-RPC loop. Every other CLI stdio server now
runs `serveStdio` on `@modelcontextprotocol/server` v2.

## Fix

Swap the dispatch to `serveStdio` + `McpServer` with `fromJsonSchema`
registrations (same pattern as the 12 migrated CLI servers), preserving the
tool surface byte-identically and the legacy `initialize` compat behavior.
`node --check` + live stdio probe + `mcp:health` 16/16.

## Low priority

Local stdio tool used by design-parity checks; no public surface. Can ride
along with the next maintenance wave.