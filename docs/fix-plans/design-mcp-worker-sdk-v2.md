# fix: workers/design-mcp is stateless-2026-07-28 but hand-rolled — SDK v2 swap applied

<!-- P31-HEADER
id: p31_fix_plan_design_mcp_worker_sdk_v2_20261012_v1.0
type: fix-plan
component: workers/design-mcp
status: resolved
retention: keep-forever
created: 2026-10-12T00:00:00Z
owner: will
-->

## Symptom

`workers/design-mcp/src/index.ts` spoke the MCP 2026-07-28 stateless
protocol hand-rolled (SEP-2575 `server/discover` + `_meta` envelope,
SEP-2322 `resultType`, SEP-2549 `ttlMs`/`cacheScope` on tools/list /
resources/list / prompts/list, a deprecated legacy-compat
`initialize`/`initialized` branch) but never imported
`@modelcontextprotocol/server`. Its CLI twin
(`cli/design-mcp-server.js`) was swapped earlier
(`docs/fix-plans/design-mcp-server-sdk-v2-remainder.md`); the worker half
was the last design surface still hand-rolling the JSON-RPC dispatch.

## What was done

1. Wired POST JSON-RPC through the split SDK v2
   (`@modelcontextprotocol/server` 2.3.1 → `McpServer` +
   `createMcpHandler`; linked into `workers/design-mcp/node_modules` from
   the workspace pnpm store — no install run;
   `"@modelcontextprotocol/server": "^2.0.0"` declared in
   `workers/design-mcp/package.json`).
2. Registered all 38 tools via `fromJsonSchema` (the `TOOLS` table is
   untouched — `tools/list` emits the original inputSchema objects
   verbatim; **38 tools, 0 diffs**).
3. Registered the 10 resources with the SDK resource APIs: 10 static
   resources in `resources/list` order (design://tokens, design://components,
   design://icons, the five `ui://p31/component/*` previews, ui://p31/catalog,
   ui://p31/icons) plus read-path ResourceTemplates with `list: undefined`
   for `design://tokens/{path*}`, `design://components/{path*}`,
   `design://icons/{path*}`, `ui://p31/icons/{id}`,
   `ui://p31/component/{name}`, `ui://p31/tokens/css`, `p31://skills`,
   `p31://skills/{name}` — `resources/list` stays byte-identical and every
   hand-rolled read path keeps serving.
4. Registered the 3 prompts via the SDK prompt API (same names,
   descriptions, and `prompts/get` bodies).
5. Kept legacy-compat behavior by **intercepting `initialize` /
   `initialized` / `notifications/initialized` before the handler** with the
   exact hand-rolled responses (initialize pins 2024-11-05 with
   `tools.listChanged: false`); everything else is served by the SDK handler
   (claim-less legacy follow-up traffic goes through the SDK's
   `legacy: 'stateless'` fallback).
6. Preserved every route: `/health`, `/tokens.dtc.json`, `/api/cache/check`,
   `/api/cache/store`, `GET /` (HTML tool listing), the server card, the XAA
   opt-in guard, CORS, and the 405 fallback.

## Evidence

- `npx tsc --noEmit` exit 0; vitest suite green (4 files, 85/85 tests).
- `wrangler deploy --dry-run` clean; deployed
  `abf8be96-5d0a-4dd0-b556-7ca887cc108a` (2026-10-12).
- Live probes: `server/discover` 200 (`supportedVersions: [2026-07-28]`),
  `tools/list` 200 (38 tools, `ttlMs: 60000`, `cacheScope: public`),
  `tools/call token_resolve` 200, `resources/read design://tokens{,/path}`,
  `ui://p31/tokens/css`, `p31://skills{,/name}` all 200, `prompts/list` +
  `prompts/get` 200, legacy `initialize` 200 pinned at 2024-11-05,
  `GET /health` 200.
- Known deltas (documented, no consumer impact): unknown tool → -32602
  `Tool X not found`; unknown resource URI → -32602 `Resource not found`
  (SDK message); `server/discover` now emits the SDK-canonical shape
  (`supportedVersions`, `listChanged: true` capabilities); argument schema
  failures now surface as the SDK's `isError` tool result. The
  `ui://p31/component/*` previews were fixed in the same wave — the
  hand-rolled reader passed a bare string to `componentPreviewHtmlInline`
  and always rendered the not-found div (see
  `design-mcp-component-preview-arg-bug.md`).