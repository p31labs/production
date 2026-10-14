# fix: workers/marketplace-mcp is stateless-2026-07-28 but hand-rolled — SDK v2 swap applied

<!-- P31-HEADER
id: p31_fix_plan_marketplace_mcp_sdk_v2_20261012_v1.0
type: fix-plan
component: workers/marketplace-mcp
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

## Symptom

`workers/marketplace-mcp/src/index.ts` spoke the MCP 2026-07-28 stateless
protocol hand-rolled: SEP-2575 `server/discover` + `_meta` envelope,
SEP-2322 `resultType`, SEP-2549 `ttlMs`/`cacheScope` on `tools/list`,
SEP-2243 `Mcp-Method`/`Mcp-Name` header validation, a deprecated
legacy-compat `initialize`/`notifications/initialized` branch (negotiating
2025-11-25..2024-10-07), no `Mcp-Session-Id`, no `ping`. It never imported
`@modelcontextprotocol/server`. This was the last marketplace-side surface
still hand-rolling the JSON-RPC dispatch.

## What was done

1. Wired `POST /mcp` through the split SDK v2
   (`@modelcontextprotocol/server` 2.3.1 → `McpServer` +
   `createMcpHandler`; linked into `workers/marketplace-mcp/node_modules`
   from the workspace pnpm store — no install run;
   `"@modelcontextprotocol/server": "^2.0.0"` declared in
   `workers/marketplace-mcp/package.json`). The handler is built per
   request (`createMcpHandler(() => buildServer(env))`) so tool callbacks
   close over the request's `env` (CatalogProxy DO bindings), matching
   workers/p31-mcp-server.
2. Registered all 10 tools via `fromJsonSchema` (the `TOOLS` table is
   untouched — `tools/list` emits the original inputSchema objects
   verbatim; **10 tools, 0 diffs**); each callback calls the existing
   `executeTool(name, args, env)`.
3. Preserved every route: `/.well-known/mcp/server-card.json`, `GET /mcp`
   metadata, `GET /health`, `GET /`, the OPTIONS CORS route, the 404
   fallback, and the `MarketplaceCatalogDO` re-export. The OAuth 2.1
   bearer gate (added in the same wave — see
   `marketplace-mcp-oauth21.md`) sits on `tools/call` **before** the SDK
   handler, answering with the envelope-shaped 401 bodies; the body is
   read once and handed to the handler as `parsedBody`.
4. Legacy compatibility: claim-less traffic and `initialize` are served by
   the SDK's default `legacy: 'stateless'` fallback (a 2025-era instance
   from the same factory); the deprecated hand-rolled initialize branch was
   removed. No pre-dispatch shim was needed.

## Evidence

- `npx tsc --noEmit` exit 0; `wrangler deploy --dry-run` clean; deployed
  `d4f17d15-f7ba-4bcf-9550-af82cfd60e06` (2026-10-12).
- Live probes: `server/discover` 200 (`supportedVersions: [2026-07-28]`),
  `tools/list` 200 (10 tools, `ttlMs: 60000`, `cacheScope: public`),
  `tools/call marketplace_search` 200 (DO-backed, `{ listings: [], count:
  0 }`), legacy `initialize` 200, `GET /health` 200, server-card 200.
- Known deltas (documented, no consumer impact): unknown tool → -32602
  `Tool X not found` (SDK message); SEP-2243 header/body agreement and
  `MCP-Protocol-Version` handling are now SDK-internal (same codes,
  -32020/-32022); argument schema failures now surface as the SDK's
  `isError` tool result.