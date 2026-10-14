# fix: phenix-wallet-mcp MCP surface is stateless-2026-07-28 but not yet wired through the split SDK v2

<!-- P31-HEADER
id: p31_fix_plan_phenix_wallet_sdk_v2_remainder_20261011_v1.0
type: fix-plan
component: workers/phenix-wallet-mcp
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/phenix-wallet-mcp/src/index.ts` now genuinely matches its header
claim of "stateless MCP (2026-07-28)": SEP-2575 `_meta` envelope,
`server/discover`, SEP-2322 `resultType`, SEP-2549 `ttlMs`/`cacheScope`,
`-32022` version mismatches, deprecated legacy initialize/initialized branch,
`/health` advertising `protocol: '2026-07-28'` (was '2025-11-25'). The
`@modelcontextprotocol/server` ^2.0.0 dependency is declared in
`workers/phenix-wallet-mcp/package.json` but the request handling has not yet
been moved onto the SDK v2 server API.

## What remains (exact steps)

1. Wire the POST surface through the SDK v2 server API:
   - `server.registerTool(name, { description, inputSchema:
     fromJsonSchema(tool.inputSchema) }, cb)` for every tool in the `TOOLS`
     registry, with `cb` calling `tool.handler(args, args.sessionId)`.
     Tool handlers are pure w.r.t. bindings (no `env` capture needed —
     module-level factory is safe).
   - Wallet state stays SEP-2567-shaped: server-minted `sessionId` handles
     passed as ordinary tool arguments. Do NOT reintroduce protocol-level
     sessions or `Mcp-Session-Id`.
   - Legacy 2025 serving stays via the SDK default (`legacy: 'stateless'`),
     equivalent to the current hand-rolled legacy branch.
2. Wrap handler responses with the existing CORS headers.
3. Keep the server-card, `/health`, and OPTIONS handlers unchanged.
4. After `pnpm install` lands `@modelcontextprotocol/server`, run
   `npx tsc --noEmit` (the `typecheck` script) in `workers/phenix-wallet-mcp`.
5. Remove the dead hand-rolled stateless helpers once the SDK path serves.

## Already done (this migration)

- Stateless protocol shapes implemented faithfully by hand (SEP-2575/2322/
  2549/2243/2567); legacy compat branch kept; `/health` protocol claim
  corrected to 2026-07-28; no `ping`/`logging/setLevel`; no `Mcp-Session-Id`.
- `@modelcontextprotocol/server@^2.0.0` added to `package.json` dependencies
  (currently unused until step 1).

## Evidence

`workers/phenix-wallet-mcp/src/index.ts` — stateless core helpers +
`server/discover` / `tools/list` / `tools/call` dispatch with legacy
`initialize`/`initialized` branch (added 2026-10-11).

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

- `workers/phenix-wallet-mcp/src/index.ts` — SDK v2 wiring (buildServer + handler +
  CORS wrapper; the `/mcp` POST branch delegates to `handler.fetch`).
- `npx tsc --noEmit` green in `workers/phenix-wallet-mcp`.
- `npx wrangler deploy --dry-run` bundles cleanly.
- Live smoke (wrangler dev): `server/discover` answers 2026-07-28,
  `tools/list` emits all tools with `ttlMs: 60000`/`cacheScope: "public"`,
  `tools/call` returns the same payloads, legacy `initialize` negotiates
  `2025-11-25`, unsupported versions answer `-32022`.
