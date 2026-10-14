# fix: tools/design-parity/parity-server.mjs speaks legacy 2024-11-05 handshake

<!-- P31-HEADER
id: p31_fix_plan_design_parity_stateless_migration_20261011_v1.0
type: fix-plan
component: tools/design-parity
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`tools/design-parity/parity-server.mjs` is entirely legacy:

- `initialize` → `'2024-11-05'` (:309-314)
- `notifications/initialized` (:316)
- `ping` (:334-335)
- no `server/discover`, no `resultType`, no `ttlMs`/`cacheScope` on `tools/list`
  (:318-319), no `_meta` envelope, no error-code renumbering.

## Resolution (2026-10-11)

Migrated to the stateless 2026-07-28 shape used by the other CLI stdio servers
(phos-forge/mcp-server.mjs pattern):

1. Main path: `server/discover`, `tools/list` (with `ttlMs` + `cacheScope`),
   `tools/call` (with `resultType: 'complete'` on every result).
2. Every response carries a namespaced `_meta` envelope:
   `io.modelcontextprotocol/protocolVersion` + `io.modelcontextprotocol/serverInfo`.
3. `-32004` → `-32022` error-code renumbering map (2026-07-28 RC reserved range).
4. Legacy `initialize` kept ONLY in a `// Deprecated legacy-compat branch
   (pre-SEP-2575)` returning `2024-11-05`; `notifications/initialized` returns no
   response; `ping` removed.
5. Verified: `node --check` clean + live stdio probe (discover, initialize,
   tools/list, tools/call) all pass. Launch command unchanged
   (`node tools/design-parity/parity-server.mjs`) — the mcp:health config and
   `sierpinski-audit.mjs` mcpCall (raw tools/call, no initialize) keep working.