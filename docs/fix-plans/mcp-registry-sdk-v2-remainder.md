# fix: mcp-registry MCP surface is stateless-2026-07-28 but not yet wired through the split SDK v2

<!-- P31-HEADER
id: p31_fix_plan_mcp_registry_sdk_v2_remainder_20261011_v1.0
type: fix-plan
component: workers/mcp-registry
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/mcp-registry/src/index.ts` speaks the MCP 2026-07-28 stateless
protocol hand-rolled (SEP-2575 `_meta` envelope on `handleMcpSurface`,
`server/discover`, SEP-2322 `resultType`, SEP-2549 `ttlMs`/`cacheScope`,
`-32022` version mismatches, deprecated legacy initialize/initialized
branch), and its *client* side (probes + call proxy) is stateless-first with
SEP-2243 `Mcp-Method`/`Mcp-Name` headers and the `_meta` envelope on every
POST. The `@modelcontextprotocol/server` ^2.0.0 dependency is declared in
`workers/mcp-registry/package.json` but the server-side surface has not yet
been moved onto the SDK v2 server API.

## What remains (exact steps)

1. Wire `handleMcpSurface`'s server side through the SDK v2 server API:
   - `server.registerTool(name, { description, inputSchema:
     fromJsonSchema(tool.inputSchema) }, cb)` for `list_servers`,
     `get_server`, `call_tool`, with `cb` calling the existing handlers
     (`handleListServers`, `summary`, `proxyToolCall` — all take `env`, so
     create the handler per request inside `fetch` or bridge `env` via a
     `WeakMap<Request, Env>` read from `ctx.requestInfo`).
   - Legacy 2025 serving stays via the SDK default (`legacy: 'stateless'`),
     equivalent to the current hand-rolled legacy branch.
2. The *client* side (probes, `rpcCall`, `proxyToolCall`) is already
   stateless-first and spec-shaped — no SDK change required there; keep it.
3. Keep the well-known card (`protocolVersion: 2026-07-28`), HTML listing,
   sanitizer/audit/quota governance, and DO ledger untouched.
4. After `pnpm install` lands `@modelcontextprotocol/server`, run
   `npx tsc --noEmit` and `npx vitest run` (75 tests must stay green).
5. Remove the dead hand-rolled stateless helpers (`mcpEnvelope`,
   `mcpResultBody`, `mcpErrBody`) once the SDK path serves.

## Already done (this migration)

- Probe now accepts 2026-07-28 (`SUPPORTED_PROTOCOL_VERSIONS` includes it;
  the "fabricated version" comment and the `unsupported protocol version
  2026-07-28` rejection are gone); probes are stateless-first
  (`server/discover` → `tools/list` with `_meta`), falling back to the legacy
  initialize handshake; SEP-2243 headers on every outbound POST; own surface
  migrated to stateless shapes with a legacy compat branch.
- `src/index.test.ts` updated: 2026-07-28 registration now accepted (201),
  fabricated `2099-01-01` still rejected (negative control), well-known card
  asserts `protocolVersion === PROTOCOL_VERSION`; 75/75 tests pass.
- `@modelcontextprotocol/server@^2.0.0` added to `package.json` dependencies
  (currently unused until step 1).

## Evidence

`workers/mcp-registry/src/index.ts` — `PROTOCOL_VERSION`, `rpcCall`
(`stateless` param, `Mcp-Method`/`Mcp-Name` headers), `probeTools`/
`probeEndpoint` stateless-first, `handleMcpSurface` stateless dispatch with
legacy branch (all changed 2026-10-11); `src/index.test.ts` — updated
registration/version/card tests.

## Resolution (2026-10-11)

Resolved — both halves of the marketplace now run on the split SDK v2.

**Server side** (`handleMcpSurface`):

- `buildRegistryServer(env)` registers `list_servers`, `get_server`, and
  `call_tool` via `server.registerTool(name, { description, inputSchema:
  fromJsonSchema(tool.inputSchema) }, cb)`; the callbacks invoke the
  unchanged `handleListServers` / `summary` / `proxyToolCall` (the
  `call_tool` callback resolves the original request from `ctx.http?.req`).
- Served by `createMcpHandler` per request (closes over `env`); modern
  2026-07-28 requests get `server/discover` / `_meta` / `resultType` /
  ttlMs-cacheScope / `-32022` from the SDK; 2025-era claim-less requests go
  through the SDK default `legacy: 'stateless'` fallback (initialize
  handshake, SSE-streamed responses) — the previous hand-rolled legacy
  branch. CORS headers are re-applied by a wrapper; the dead `mcpEnvelope` /
  `mcpResultBody` / `mcpErrBody` helpers were removed.

**Client side** (`rpcCall` / `probeTools` / `probeEndpoint`):

- Reimplemented on `@modelcontextprotocol/client` v2 (`Client` +
  `StreamableHTTPClientTransport`, `versionNegotiation: { mode: 'auto' }`):
  the probe sends `server/discover` (SEP-2575 `_meta` envelope emitted by
  the SDK, SEP-2243 MCP-Protocol-Version / Mcp-Method / Mcp-Name headers
  emitted by the SDK) and falls back to the plain legacy `initialize`
  handshake; `Mcp-Name` is set via `requestInit`; per-call headers
  (`X-Capability-Token`, `Accept`) ride `RequestOptions.headers`.
- Version gating preserved: the negotiated protocol version is validated
  against `SUPPORTED_PROTOCOL_VERSIONS`; a fabricated revision that breaks
  negotiation surfaces through the failure message and is rejected with the
  same `unsupported protocol version <v>` detail (registration still 400).
- `@modelcontextprotocol/client@^2.0.0` added to `workers/mcp-registry/
  package.json` (store package already present from the install wave —
  wired by symlink, no `pnpm install` run).

**Tests** (`src/index.test.ts`): mocks updated to the new wire internals —
modern-shaped discover/list/call responses (resultType + `_meta` inside
`result`), `notifications/initialized` 202, `serverInfo.version` on
initialize results, `Content-Type: application/json` on responses, dual
`Accept` on `/mcp` POSTs, and an SSE reader for the legacy responses.
Externally-visible behavior unchanged: 2026-07-28 probe accepted (201),
fabricated 2099-01-01 rejected, registration 201 — **75/75 tests green**.

Evidence:

- `workers/mcp-registry/src/index.ts` — v2 server surface + v2 client
  probes (all changed 2026-10-11).
- `workers/mcp-registry/src/index.test.ts` — wire-shape mock updates.
- `npx tsc --noEmit` green; `npx vitest run` 75/75 green;
  `npx wrangler deploy --dry-run` bundles cleanly (client included).
