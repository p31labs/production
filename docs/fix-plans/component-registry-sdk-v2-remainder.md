# fix: component-registry MCP pair (cli stdio + worker Streamable HTTP) is stateless-2026-07-28 but still hand-rolled — SDK v2 swap pending

<!-- P31-HEADER
id: p31_fix_plan_component_registry_sdk_v2_remainder_20261011_v1.0
type: fix-plan
component: cli/component-registry.js + workers/component-registry
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

Both halves of the component-registry MCP surface speak the MCP 2026-07-28
stateless protocol hand-rolled: `cli/component-registry.js` (stdio, zero
dependencies) and `workers/component-registry/src/index.ts` (Streamable HTTP
POST /mcp). Neither is wired through the split SDK v2
(`@modelcontextprotocol/server` ^2.0.0); no SDK dependency is declared in
either location. The stateless shapes themselves (SEP-2575 `_meta` envelope +
`server/discover`, SEP-2322 `resultType`, SEP-2549 `ttlMs`/`cacheScope`,
SEP-2243 `Mcp-Method`/`Mcp-Name` header validation, `-32020`/`-32022`
renumbering, deprecated legacy initialize/initialized branch, no
`Mcp-Session-Id`, no `ping`) are implemented faithfully by hand.

## What remains (exact steps)

1. CLI half — `cli/component-registry.js`:
   - Swap the hand-rolled stdio loop for `@modelcontextprotocol/server`
     ^2.0.0, stdio transport behind the `/stdio` subpath convention used by
     the other CLI servers (see `cli/love-registry.js` header comment), with
     the SDK default (`legacy: 'stateless'`) replacing the hand-rolled
     deprecated legacy branch.
   - Register the 5 `design_*` tools, each callback calling the existing
     `executeTool(name, args)` unchanged.
2. Worker half — `workers/component-registry/src/index.ts`:
   - Wire the POST `/mcp` path through the SDK v2 server API:
     `server.registerTool(...)` for all 5 tools, with `cb` calling
     `executeTool(name, args)` from `src/registry.js`.
   - Keep `/health`, `/components`, `/components/:name`, `/tokens`, the
     GET `/mcp` metadata route, and the OPTIONS CORS route unchanged; only
     `/mcp` POST routes to the SDK handler.
   - Wrap SDK handler responses with the existing `corsHeaders`.
3. After the coordinated `pnpm install` lands `@modelcontextprotocol/server`
   (shared lockfile — do not install independently), verify:
   - `node --check cli/component-registry.js`
   - `npx tsc --noEmit` in `workers/component-registry`
   - Re-run the live stdio probe (discover / initialize / tools/list /
     tools/call) and the Streamable HTTP probe from the migration report.
4. Remove the dead hand-rolled stateless helpers once the SDK path serves.

## Already done (this migration)

- `cli/component-registry.js`: stateless main path (`server/discover`,
  `_meta` envelope with protocolVersion + clientInfo, `resultType` on every
  result, `ttlMs` + `cacheScope: 'public'` on `tools/list`), deprecated
  legacy-compat branch (initialize → `2024-11-05`, notifications/initialized
  → no-op), error-code remap (-32001→-32020, -32003→-32021, -32004→-32022),
  `ping` removed, no `Mcp-Session-Id`. All 5 tools and the canonical
  32-component data unchanged.
- `workers/component-registry/src/index.ts`: same stateless core on
  POST `/mcp` (`server/discover`, `_meta` extraction with version mismatch →
  -32022, `resultType`, `ttlMs`/`cacheScope`, SEP-2243 `Mcp-Method`/`Mcp-Name`
  validation with -32020, `MCP-Protocol-Version` header), deprecated legacy
  initialize/initialized branch, `ping` removed, GET `/mcp` metadata route
  added, CORS allows `Mcp-Method`/`Mcp-Name`/`MCP-Protocol-Version`. Existing
  routes and tool behaviors unchanged.

## Evidence

- `cli/component-registry.js` — stateless core helpers + `server/discover` /
  `tools/list` / `tools/call` dispatch with deprecated legacy
  `initialize`/`notifications/initialized` branch (added 2026-10-11).
- `workers/component-registry/src/index.ts` — stateless core helpers +
  header validation + `server/discover` / `tools/list` / `tools/call`
  dispatch with deprecated legacy branch (added 2026-10-11).
- Live stdio probe and `npx tsc --noEmit` green at migration time.

## Resolution — 2026-10-11 (SDK-v2 swap applied)

The hand-rolled stdio JSON-RPC loop in `cli/component-registry.js` was replaced with
`serveStdio` from `@modelcontextprotocol/server@2.3.1` (`/stdio` subpath;
package already present in the workspace pnpm store — the top-level
`node_modules/@modelcontextprotocol/server` link was completed, no install
run). `cli/package.json` gained `"@modelcontextprotocol/server": "^2.0.0"`.

- **Tool surface byte-identical:** the `TOOLS` table is untouched; each tool
  is registered via the SDK's `fromJsonSchema(tool.inputSchema)`, which emits
  the original JSON Schema verbatim. Pre/post-swap snapshot diff of
  `tools/list`: **5 tools, 0 diffs**.
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

## Resolution — 2026-10-12 (worker half — SDK-v2 swap applied)

The worker half (`workers/component-registry/src/index.ts`) followed the CLI
half in this wave, completing the pair. The hand-rolled POST `/mcp` dispatch
was replaced with the split SDK v2 (`@modelcontextprotocol/server` 2.3.1 →
`McpServer` + `createMcpHandler`, linked into
`workers/component-registry/node_modules` from the workspace pnpm store — no
install run; `"@modelcontextprotocol/server": "^2.0.0"` declared in
`workers/component-registry/package.json`).

- **Tool surface byte-identical:** the 5 tools are registered from the
  `TOOLS` table in `src/registry.js` via `fromJsonSchema`, emitting the
  original JSON Schema verbatim; `tools/list` → **5 tools, 0 diffs**
  (verified by pre/post snapshot during the migration). `tools/call`
  payloads keep the exact legacy content-text shapes; the
  `design_spoon_guide` gap was closed in the same wave (see
  `component-registry-worker-spoon-guide-gap.md`).
- **Routes unchanged:** `/health`, `/components`, `/components/:name`,
  `/tokens`, `GET /mcp` metadata, the OPTIONS CORS route, and the 404
  fallback are untouched. Only `POST /mcp` routes to the SDK handler, and
  SDK responses are wrapped with the existing `corsHeaders` (CORS keeps
  `Mcp-Method`/`Mcp-Name`/`MCP-Protocol-Version`).
- **Legacy compatibility:** opening-era routing is the SDK's. Claim-less
  traffic and `initialize` are served by the SDK's default
  `legacy: 'stateless'` fallback (a 2025-era instance from the same
  factory) — the deprecated hand-rolled `initialize`/`initialized` branch
  was removed; no pre-dispatch shim was needed (live probe: initialize
  200 + result).
- **Stateless 2026-07-28 surface:** `server/discover` →
  `supportedVersions: [2026-07-28]`, `capabilities`, `resultType`;
  `tools/list` → `resultType: complete`, `ttlMs: 300000`,
  `cacheScope: public` (via `cacheHints`), per-request `_meta` envelope
  (spec-canonical `params._meta`), SEP-2243 `Mcp-Method`/`Mcp-Name`
  validation (SDK-internal).
- **Evidence:** `npx tsc --noEmit` exit 0; `wrangler deploy --dry-run`
  clean; deployed `08630886-5949-417e-8293-a75b9eed67c3` (2026-10-12). Live
  probes: `server/discover` 200, `tools/list` 200 (5 tools),
  `tools/call design_spoon_guide` 200 (spoonGuide levels 0-5,
  cssAttribute, motionScaling, status ok), legacy `initialize` 200,
  `GET /tokens` 200. Known deltas (documented, no consumer impact): unknown
  tool name now answers -32602 `Tool X not found` (same code, SDK message);
  `MCP-Protocol-Version` header/body agreement is enforced by the SDK's
  SEP-2243 ladder.
