# fix: p31-capital-machine-mcp MCP surface is stateless-2026-07-28 but not yet wired through the split SDK v2

<!-- P31-HEADER
id: p31_fix_plan_capital_machine_sdk_v2_remainder_20261011_v1.0
type: fix-plan
component: workers/p31-capital-machine-mcp
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/p31-capital-machine-mcp/src/index.ts` speaks the MCP 2026-07-28
stateless protocol hand-rolled inside the Hono `/mcp` route (SEP-2575 `_meta`
envelope, `server/discover`, SEP-2322 `resultType`, SEP-2549
`ttlMs`/`cacheScope`, `-32022` version mismatches, deprecated legacy
initialize/initialized branch). The `@modelcontextprotocol/server` ^2.0.0
dependency is declared in `workers/p31-capital-machine-mcp/package.json` but
the request handling has not yet been moved onto the SDK v2 server API.

## What remains (exact steps)

1. Wire the `/mcp` POST route through the SDK v2 server API:
   - `server.registerTool(name, { description, inputSchema:
     fromJsonSchema(tool.inputSchema) }, cb)` for the 11 `TOOLS`, with `cb`
     calling `executeTool(name, args, env)`.
   - **Hard constraint — do not regress the payment/auth gates.** The x402
     `paymentMiddleware` (402 challenge + Bazaar enrichment), the
     `OPERATOR_TOOLS` X-Operator-Token gate, `enforceSpendLimit`, and the
     OAuth 2.1 / RFC 8707 `verifyOAuthBearer` gate must all keep running on
     the paid/operator tools. The SDK path can pass validated auth through
     `McpHandlerRequestOptions.authInfo` (see `requireBearerAuth` in the SDK),
     but the x402 402 challenge must be answered *before* the SDK handler for
     unpaid paid-tool calls (read `params.name` from a cloned body, as the
     current middleware does).
   - Legacy 2025 serving stays via the SDK default (`legacy: 'stateless'`),
     equivalent to the current hand-rolled legacy branch.
2. Keep the `.well-known/*` metadata endpoints, `/resources/:tool` REST
   mirror, and llms.txt unchanged.
3. After `pnpm install` lands `@modelcontextprotocol/server`, run
   `npx tsc --noEmit` (the `typecheck` script).
4. Remove the dead hand-rolled stateless helpers once the SDK path serves.

## Already done (this migration)

- Stateless protocol shapes implemented faithfully by hand (SEP-2575/2322/
  2549/2243/2567); legacy compat branch kept (initialize negotiates the old
  revision the client requested); no `Mcp-Session-Id`; the OAuth 2.1 / RFC
  8707 resource-server implementation (JWKS cache, RS256/ES256/Ed25519
  WebCrypto verification, `aud` binding) and the x402 gate were preserved
  untouched on the tools/call path.
- `@modelcontextprotocol/server@^2.0.0` added to `package.json` dependencies
  (currently unused until step 1).

## Evidence

`workers/p31-capital-machine-mcp/src/index.ts` — stateless core helpers +
`server/discover` / `tools/list` / `tools/call` dispatch with legacy
`initialize`/`initialized` branch (added 2026-10-11); OAuth verification
block (`verifyOAuthBearer` call inside tools/call) byte-for-byte intact.

## Resolution (2026-10-11)

Resolved — the `/mcp` POST route now runs on the split SDK v2
(`@modelcontextprotocol/server` -> `McpServer` + `createMcpHandler`).

- `buildServer(env)` registers all 11 `TOOLS` via `server.registerTool(name,
  { description, inputSchema: fromJsonSchema(tool.inputSchema) }, cb)` with
  `cb` calling the unchanged `executeTool(name, args, env)`; `capabilities:
  { tools: {} }` + `cacheHints: { 'tools/list': { ttlMs: 60_000,
  cacheScope: 'public' } }` configure the SDK surface.
- **Gates preserved, in order, BEFORE the SDK handler:** the Hono
  `app.use("/mcp")` x402 `paymentMiddleware` (unpaid paid-tool calls get the
  402 challenge + Bazaar enrichment), then inside `app.post("/mcp")` the
  OAuth 2.1 / RFC 8707 `verifyOAuthBearer` gate (invalid bearer -> 401
  envelope-shaped result) and the `OPERATOR_TOOLS` X-Operator-Token +
  `enforceSpendLimit` gates (403) — all byte-identical to the pre-swap code.
  `recordX402Revenue`/`consumeEntitlement` run from the tool callback; the
  Hono `ExecutionContext` is handed to the callback via a
  `WeakMap<Request, ExecutionContext>` populated in the route.
- The body is read once in the route and passed as `parsedBody` to
  `handler.fetch(c.req.raw, { parsedBody })` (the x402 middleware clones, it
  does not consume the body).
- Legacy 2025 serving comes from the SDK default `legacy: 'stateless'`
  fallback; the well-known endpoints, `/resources/:tool` REST mirror, and
  llms.txt are untouched.

Evidence:

- `workers/p31-capital-machine-mcp/src/index.ts` — SDK wiring + gates +
  parsedBody hand-off (the gate response helpers `mcpResult`/`mcpErr` are
  kept for the 401/403 bodies only).
- `npx tsc --noEmit` green; `npx wrangler deploy --dry-run` bundles cleanly.
- Live smoke (wrangler dev + v2 client): modern era negotiated, 11 tools
  listed, free tool `billing.listTiers` returns the TIERS payload, paid
  `revenue.getSummary` without payment answers HTTP 402 (X-PAYMENT
  challenge), legacy `initialize` negotiates `2025-11-25`.
