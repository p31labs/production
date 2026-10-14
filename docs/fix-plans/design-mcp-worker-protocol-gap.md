# fix: workers/design-mcp/src/index.ts main path pre-stateless despite advertising 2026-07-28

<!-- P31-HEADER
id: p31_fix_plan_design_mcp_worker_protocol_gap_20261011_v1.0
type: fix-plan
component: workers/design-mcp
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/design-mcp/src/index.ts` advertises `2026-07-28` via `server/discover`
(:1506) and `PROTOCOL_VERSION` (:141), but the main request path is still
pre-stateless:

- `ping` is handled on the main path (:1636-1637) — stateless 2026-07-28 has no ping.
- `initialize`/`initialized` (:1639-1647) sit on the main path with no deprecation
  marker, and the legacy-compat branch is unmasked.
- Results carry no `resultType: 'complete'` (SEP-2322).
- `tools/list` (:1617-1618), `resources/list` (:1513-1527), `prompts/list`
  (:1593-1600) carry no `ttlMs`/`cacheScope` (SEP-2549).
- The `_meta` envelope (:153-155) uses the short key `protocolVersion` instead of
  the namespaced `io.modelcontextprotocol/protocolVersion`, and omits the
  SHOULD-level `io.modelcontextprotocol/serverInfo`.

## Resolution (2026-10-11)

1. Removed `ping` from the main path.
2. `initialize`/`initialized` now live in a clearly-marked
   `// Deprecated legacy-compat branch (pre-SEP-2575)` returning the legacy
   `2024-11-05` protocolVersion for old clients, using a raw envelope (no
   resultType, no namespaced _meta) — mirrors bros/dads.
3. `mcpResponse` now injects `resultType: 'complete'` on every result;
   `tools/list`, `resources/list`, `prompts/list` now carry `ttlMs` +
   `cacheScope: 'public'` (SEP-2549).
4. `metaEnvelope` now emits `_meta: { 'io.modelcontextprotocol/protocolVersion':
   '2026-07-28', 'io.modelcontextprotocol/serverInfo': { name, version } }`;
   `extractMeta` reads both the namespaced and legacy short keys.
5. `npx tsc --noEmit` green (verified 2026-10-11). No deploy (rule: worker
   deploys out of scope for this conformance pass).