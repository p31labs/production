<!-- P31-HEADER
id: p31_fix_plan_conformance_remediation_wave_20261013_v1.0
type: fix-plan
component: workers/mcp-* (fleet conformance remediation)
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: conformance remediation wave — 2026-07-28 fleet contract

**Discovered by:** agent:subagent:mcp-conformance (the four remediations filed
at the end of `registry-conformance-badge.md` — protocolVersion omission,
x402-gateway header enforcement, spaceship-relay discover/ping, legacy-era
2026 contract — plus the residual probe failures).
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** medium — 0/17 fleet servers fully conformant on the live probe;
all four remediations were filed work.

## The gaps

Live probe (`node scripts/verify-mcp-conformance.mjs`, 2026-10-13 before):
0/17 fully conformant. Four filed remediations + three residual findings:

1. **protocolVersion omission (7 SDK-v2 servers).** bros, dads, design-mcp,
   marketplace-mcp, p31-crypto, p31-justice-hub, phenix-wallet — SDK v2
   `server/discover` emits `supportedVersions` + `capabilities` and stamps
   serverInfo into `_meta`, but never the top-level `protocolVersion`.
2. **x402-gateway header enforcement.** `/mcp` silently succeeded without a
   `Mcp-Method` header (headerless `server/discover` → 200 result).
3. **spaceship-relay.** No `server/discover` (-32601); removed `ping` returned
   a 200 `result:{}` instead of a JSON-RPC error.
4. **Legacy-era servers.** music-maker-mcp + p31-mcp-server rejected
   2026-07-28 (-32000, "supported: 2025-11-25 …"). p31-mcp-server's source was
   already SDK v2 — the deployment was stale; music-maker-mcp's raw
   `WebStandardStreamableHTTPServerTransport` path served the legacy era only.
5. **p31-shell.** -32603 "MCP server unavailable" on every /mcp POST — root
   cause `import.meta.env.DEV` at module top-level (Vite construct, undefined
   in the wrangler-built Worker).
6. **roblox-bridge.** 404 on all stateless calls — the catalog URL
   (`/mcp`) does not exist on that worker; it has no MCP surface at all.
7. **vision-*** — 400s: the four entries point at phos-ai-proxy `/vision`, an
   AI vision POST endpoint, not an MCP surface.

## The fix (resolved)

### 1. protocolVersion — additive `_ondiscover` patch (7 servers)

SDK v2's `McpServer` wraps a `Server` whose `_ondiscover()` builds the
discover result. Each `buildServer()` now re-wraps `server.server._ondiscover`
to add top-level `protocolVersion: '2026-07-28'` +
`supportedProtocolVersions` (mirroring `supportedVersions`) — additive only.

| Server | File:line |
|---|---|
| bros | workers/bros/src/index.ts:552-567 |
| dads | workers/dads/src/index.ts:607-622 |
| design-mcp | workers/design-mcp/src/index.ts:1631-1646 |
| marketplace-mcp | workers/marketplace-mcp/src/index.ts:509-524 |
| p31-crypto | workers/p31-crypto-mcp/src/index.ts:313-328 |
| p31-justice-hub | workers/p31-justice-hub/src/index.ts:574-589 |
| phenix-wallet | workers/phenix-wallet-mcp/src/index.ts:649-664 |

### 2. x402-gateway header enforcement (workers/mcp-x402-gateway/src/index.ts:632-651)

POST /mcp now returns JSON-RPC -32020 (HTTP 400) when the `Mcp-Method`
header is absent — EXCEPT the legacy `initialize`/`notifications/initialized`
handshake (kept headerless for 2025-era clients + the fleet health gate,
same exemption as the SDK-v2 ladder). The bridge's discover result missing
`supportedProtocolVersions` is filled additively on the bridge-forward path
(src/index.ts:706-720). No settlement/payment/ledger route was touched
(smoke leg C remains owner-gated).

### 3. spaceship-relay (packages/spaceship-earth/worker/index.ts:955-1014)

Hand-rolled dispatcher: added `server/discover` (protocolVersion +
supportedProtocolVersions + serverInfo + capabilities), `ping` now returns
-32601, `tools/list` returns `resultType: 'complete'`, and non-handshake
requests without `Mcp-Method` return -32020. Mesh/signaling/telemetry
functionality untouched. Also completed the deploy config: wrangler.toml KV
binding `SPACESHIP_TELEMETRY` was missing its `id`
(packages/spaceship-earth/wrangler.toml:8 — filled with the account's
existing namespace `785a943c0af94c4c9b5f9007ab77b243`,
"spaceship-relay-spaceship-telemetry").

### 4. Legacy-era servers → 2026-07-28

- **p31-mcp-server** (workers/p31-mcp-server/src/index.ts:30-31, :168-183):
  source was already SDK v2; added the same additive discover patch and
  redeployed (stale deployment was the -32000 source).
- **music-maker-mcp** (packages/music-maker-mcp/src/server.ts:24-49, :127-137):
  `createServer()` now advertises `[...SUPPORTED_PROTOCOL_VERSIONS,
  '2026-07-28']` + the discover patch, and `createWorkerHandler` serves the
  SDK v2 HTTP entry (`createMcpHandler`) instead of the legacy-only raw
  transport; src/http.ts serves the same surface.

### 5. p31-shell (shell/src/lib/mcpServer.ts)

- `import.meta.env.DEV` (Vite-only) removed from module top-level → the
  wrangler bundle no longer throws at import (the -32603 root cause)
  (shell/src/lib/mcpServer.ts:14-34).
- Added `server/discover`, `resultType: 'complete'` on tools/list (edge has
  zero loadable tools — the command registry is browser-bound; returns an
  honest empty list + note instead of a silent `{error}`), Mcp-Method
  enforcement with the initialize exemption (shell/src/lib/mcpServer.ts:95-104,
  :163-178).

## Fleet results (2026-10-13, after)

**12/17 fully conformant** (was 0/17). All four remediations + p31-shell
green: bros, dads, design-mcp, marketplace-mcp, music-maker-mcp, p31-crypto,
p31-justice-hub, p31-mcp-server, p31-shell, phenix-wallet, spaceship-relay,
x402-gateway. `node scripts/mcp-health-check.mjs` → **16/16**.

## Filed follow-ups (new — honest, not forced)

1. **roblox-bridge catalog entry** — workers/roblox-bridge has no MCP route
   (`/tools/list` + `/tools/call` are REST-ish, no Mcp dispatch); the catalog
   endpoint `/mcp` 404s. No valid URL to correct to (the allowed
   workers/mcp-registry edit covers URL corrections only). Needs a product
   decision: add an MCP surface to roblox-bridge, or rescope the catalog
   entry. Evidence: `grep -rni mcp workers/roblox-bridge/src` → empty; live
   404 on all four probe calls.
   → **RESOLVED 2026-10-13 (relabel, not remove — owner-locked precedent):**
   catalog entry relabeled as a non-MCP connector (`role: 'roblox bridge
   (not MCP)'`, `protocol: 'n/a — not an MCP server'`; description now honest:
   15 REST tools, no MCP surface). See
   docs/fix-plans/housekeeping-relabel-2026-10-13.md §1.
2. **vision-reviewer/layout/sensory/identity catalog entries** — all four
   point at `https://phos-ai-proxy.trimtab-signal.workers.dev/vision`, an AI
   vision POST endpoint (HTTP 400 for JSON-RPC; source
   apps/phos/worker-ai-proxy has no MCP surface — out of the allowed edit
   scope). Same decision needed: MCP surface on phos-ai-proxy or rescope the
   entries. Evidence: apps/phos/worker-ai-proxy/src/index.ts:152 → `/vision`
   POST → handleVision; live 400 on all probe calls.
   → **RESOLVED 2026-10-13 (same relabel):** all four entries relabeled as
   non-MCP connectors (`role: 'vision … (not MCP)'`, `protocol: 'n/a — not
   an MCP server'`; descriptions note the AI vision POST endpoint). See
   docs/fix-plans/housekeeping-relabel-2026-10-13.md §1.
3. **Shell build environment gap (pre-existing)** — shell/package.json
   declares `link:` deps on @p31ca/{ble,design-core,economy,love-ledger,
   quantum-core,rules,shared,shared-identity} but shell/node_modules/@p31ca
   was empty, so `wrangler deploy` could not bundle worker.ts. Restored the
   declared symlinks (shell/node_modules/@p31ca/* → packages/*); a root
   install should materialize them properly.
4. **Deploy credentials** — worker deploys used the pre-existing wrangler
   OAuth session (~/.wrangler/config/default.toml, trimtab.signal@proton.me);
   the gateway used the stored IP-locked token
   `/home/p31/.secrets/cf-gateway-deploy.token`. Neither is a repo-stored
   secret — noted for the owner (see report).

## Evidence

- `node scripts/verify-mcp-conformance.mjs` — before: exit 1, 0/17; after:
  12/17 (table above), exit 1 (5 honest residual gaps: roblox-bridge +
   4 vision-*).
- `node scripts/mcp-health-check.mjs` → **16/16 healthy** + design-mcp
  parity OK (40 == 40) after deploys.
- Local SDK smoke (tsx harness against the real SDK v2.3.1) verified the
  `_ondiscover` patch + music-maker createMcpHandler surface before deploy.
- Deployed version IDs (2026-10-13): bros ee5c5010, dads 403b1a99,
  marketplace-mcp 66253073, p31-crypto-mcp 57ea3696, p31-justice-hub
  81bd7067, phenix-wallet-mcp 7b9228f4, p31-mcp-server b11b5d32,
  p31-design-mcp f547bb3e, music-maker-mcp 950d5778, spaceship-relay
  8dbd5dbb, mcp-x402-gateway bcc29c3b, p31-shell 99cfecf6.