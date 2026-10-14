# fix: cli/mcp-server.js (Oasis) remains hand-rolled stdio JSON-RPC — SDK v2 remainder pending

<!-- P31-HEADER
id: p31_fix_plan_mcp_server_sdk_v2_remainder_20261011_v1.0
type: fix-plan
component: cli/mcp-server.js
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`cli/mcp-server.js` (P31 Oasis MCP server) was migrated to the MCP 2026-07-28
stateless protocol (SEP-2575): `server/discover`, `_meta`
protocolVersion/clientInfo envelopes, `resultType` on results,
`ttlMs`/`cacheScope` on `tools/list`, error-code renumbering
(-32001→-32020, -32003→-32021, -32004→-32022), no `ping`, no
`Mcp-Session-Id`, and a deprecated legacy-compat `initialize`/
`notifications/initialized` branch returning 2024-11-05. The transport,
however, is still the hand-rolled stdio JSON-RPC loop at the bottom of the
file — it does not import `@modelcontextprotocol/sdk` and never has.

## The SDK-v2 remainder

The migration brief calls for the split SDK v2 (`@modelcontextprotocol/server`
^2.0.0, stdio behind the `/stdio` subpath) where servers use the SDK. This
server is hand-rolled by design, so the SDK swap is deferred:

1. Add `"@modelcontextprotocol/server": "^2.0.0"` to `cli/package.json`
   (coordinated install — shared lockfile).
2. Replace the hand-rolled stdio loop with
   `import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'`
   and the v2 stateless `Server` class (no handshake; `server/discover`
   registration).
3. Preserve: tool behaviors, `~/.p31/cli-session.json` semantics, the stderr
   startup line, and any opencode.jsonc discovery/launch config
   (`node cli/mcp-server.js`).
4. Keep the deprecated legacy `initialize` branch only if the v2 transport
   does not already provide backward-compatible probing.

## Constraint

`pnpm install` under `/home/p31/production` is blocked until the coordinator
runs the coordinated install (shared lockfile). Code must remain dependency-free
and syntactically valid against the installed runtime until then.

## Resolution — 2026-10-11 (SDK-v2 swap applied)

The hand-rolled stdio JSON-RPC loop in `cli/mcp-server.js` was replaced with
`serveStdio` from `@modelcontextprotocol/server@2.3.1` (`/stdio` subpath;
package already present in the workspace pnpm store — the top-level
`node_modules/@modelcontextprotocol/server` link was completed, no install
run). `cli/package.json` gained `"@modelcontextprotocol/server": "^2.0.0"`.

- **Tool surface byte-identical:** the `TOOLS` table is untouched; each tool
  is registered via the SDK's `fromJsonSchema(tool.inputSchema)`, which emits
  the original JSON Schema verbatim. Pre/post-swap snapshot diff of
  `tools/list`: **11 tools, 0 diffs**.
- **Legacy compatibility:** opening-era routing is the SDK's. Claim-less
  traffic and `initialize` pin a 2025-era instance from the same factory —
  live probe: `initialize` with protocolVersion 2024-11-05 (and 2025-11-25)
  is answered with the same version, `tools/list`/`tools/call` work, and the
  bridge's claim-less `initialize {}` still yields a response the bridge
  tolerates, with `tools/list`+`tools/call` fully functional afterwards.
  No pre-dispatch shim was needed.
- **Stateless 2026-07-28 surface:** `server/discover` → `supportedVersions:
  [2026-07-28]`, `capabilities`, `resultType`, `ttlMs`/`cacheScope`;
  `tools/list` → `resultType: complete`, `ttlMs: 300000`,
  `cacheScope: public` (configured via `cacheHints`), per-request `_meta`
  envelope (spec-canonical `params._meta` with `io.modelcontextprotocol/*`
  keys — the old top-level `_meta` was non-spec and had no consumer).
- **Evidence:** `node --check` clean; live stdio probes (legacy, bridge,
  modern) all answer correctly; `tools/call` payloads keep the exact legacy
  content-text shapes. Known deltas (documented, no consumer impact): unknown
  tool name now answers -32602 `Tool X not found` (was `Unknown tool: X`,
  same code); arguments that fail schema validation now produce the SDK's
  `isError` tool result instead of reaching handler-side validation (valid
  inputs are unaffected).
