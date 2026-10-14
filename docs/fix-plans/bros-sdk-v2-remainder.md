# fix: bros MCP surface is stateless-2026-07-28 but not yet wired through the split SDK v2

<!-- P31-HEADER
id: p31_fix_plan_bros_sdk_v2_remainder_20261011_v1.0
type: fix-plan
component: workers/bros
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/bros/src/index.ts` speaks the MCP 2026-07-28 stateless protocol
hand-rolled (SEP-2575 `_meta` envelope, `server/discover`, SEP-2322
`resultType`, SEP-2549 `ttlMs`/`cacheScope`, `-32022` version mismatches,
deprecated legacy initialize/initialized branch). The `@modelcontextprotocol/server`
^2.0.0 dependency is declared in `workers/bros/package.json` but the request
handling has not yet been moved onto the SDK v2 server API
(`createMcpHandler` + `McpServer`).

## What remains (exact steps)

1. Wire the `/mcp` POST path through the SDK v2 server API:
   - Module-level `createMcpHandler(() => buildServer())` where `buildServer()`
     registers all 8 `BROS_TOOLS` via `server.registerTool(name,
     { description, inputSchema: fromJsonSchema(tool.inputSchema) }, cb)`
     with `cb` calling `executeBrosTool(name, args)` (tools are pure — no
     `env` capture needed, so a module-level factory is safe).
   - Keep `server/discover`, legacy 2025 serving, error renumbering, and
     `resultType`/`ttlMs` semantics as provided by the SDK (`legacy:
     'stateless'` is the default and preserves the initialize handshake for
     old clients — equivalent to the current hand-rolled legacy branch).
2. Wrap handler responses with the existing CORS headers
   (`Access-Control-Allow-Origin: *`) — the SDK handler does not add them.
3. Keep the `/rooms/*` Durable Object routing, server-card, `/health`, and
   `/` handlers exactly as they are; only `/mcp` routes to the SDK handler.
4. After `pnpm install` lands `@modelcontextprotocol/server`, run
   `npx tsc --noEmit` in `workers/bros` and fix any type drift.
5. Remove the now-dead hand-rolled stateless helpers (`metaEnvelope`,
   `extractMeta`, `protocolError`, `mcpResult`, `mcpErr`) once the SDK path
   is serving.

## Already done (this migration)

- Stateless protocol shapes implemented faithfully by hand (SEP-2575/2322/
  2549/2243/2567); legacy compat branch kept; GET /mcp SSE endpoint removed;
  `ping`/`logging/setLevel` removed; no `Mcp-Session-Id`.
- `@modelcontextprotocol/server@^2.0.0` added to `package.json` dependencies
  (currently unused until step 1).

## Evidence

`workers/bros/src/index.ts` — stateless core helpers + `server/discover` /
`tools/list` / `tools/call` dispatch with legacy `initialize`/`initialized`
branch (added 2026-10-11).

## Resolution (2026-10-11)

Resolved — the `/mcp` POST path now runs on the split SDK v2
(`@modelcontextprotocol/server` -> `McpServer` + `createMcpHandler`).

- `buildServer()` registers every tool via `server.registerTool(name, { description, inputSchema: fromJsonSchema(tool.inputSchema) }, cb)`
  with `cb` calling the unchanged tool executor (same payloads, same side
  effects); `capabilities: { tools: {} }` and
  `cacheHints: { 'tools/list': { ttlMs: 60_000, cacheScope: 'public' } }`
  configure the SDK surface.
- Legacy 2025 serving comes from the SDK default `legacy: 'stateless'`
  fallback (initialize handshake + SSE-streamed responses) — equivalent to
  the removed hand-rolled legacy branch.
- `server/discover`, the `_meta` envelope, `resultType`, ttlMs/cacheScope,
  and `-32022` version mismatches are served by the SDK handler; CORS
  headers are re-applied by a small wrapper.
- Dead hand-rolled helpers (`metaEnvelope`, `extractMeta`, `protocolError`,
  `mcpResult`, `mcpErr`) removed.

Evidence:

- `workers/bros/src/index.ts` — SDK v2 wiring (buildServer + handler +
  CORS wrapper; the `/mcp` POST branch delegates to `handler.fetch`).
- `npx tsc --noEmit` green in `workers/bros`.
- `npx wrangler deploy --dry-run` bundles cleanly.
- Live smoke (wrangler dev): `server/discover` answers 2026-07-28,
  `tools/list` emits all tools with `ttlMs: 60000`/`cacheScope: "public"`,
  `tools/call` returns the same payloads, legacy `initialize` negotiates
  `2025-11-25`, unsupported versions answer `-32022`.
