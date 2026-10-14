<!-- P31-HEADER
id: p31_fix_plan_registry_conformance_badge_20261013_v1.0
type: fix-plan
component: workers/mcp-registry
status: resolved
retention: keep-forever
created: 2026-10-13T00:00:00Z
owner: will
-->

# fix-plan: registry conformance badge + fleet conformance probe

**Discovered by:** agent:subagent:mcp-conformance (registry conformance leg —
the fleet had no machine-readable check of the 2026-07-28 stateless contract,
and the registry's `/servers` surface exposed health but no conformance
signal for the marketplace portal to badge).
**Discovered at:** 2026-10-13T00:00:00Z
**Severity:** medium — discovery/resultType/header-enforcement drift across
17 remote catalog entries was invisible to both the registry and the
marketplace portal.

## The gaps

1. **No conformance sensor.** Health (`probeHealth`) proves reachability only.
   A server could silently accept headerless requests or never negotiate the
   2026-07-28 stateless era, and nothing in the registry would notice.
2. **Fleet drift.** The first live probe found the fleet split into two eras
   and several spec gaps (table below).
3. **No portal hook.** `GET /servers` entries had `health`/`latencyMs` but no
   per-server conformance object for the marketplace portal's badge row.

## The fix

### 1. Conformance sensor — `scripts/verify-mcp-conformance.mjs` (NEW)

Plain node, zero dependencies. Reads the catalog straight from the registry
source (`OFFICIAL_CATALOG` in workers/mcp-registry/src/index.ts, remote
entries only) and asserts, per server, the full stateless contract
(`Mcp-Method`/`Mcp-Name`/`MCP-Protocol-Version: 2026-07-28` headers +
`params._meta` envelope):

- (a) `server/discover` returns `protocolVersion` / `supportedProtocolVersions` / `serverInfo`
- (b) `tools/list` returns `resultType: "complete"`
- (c) removed method `ping` returns a JSON-RPC **error object** (never a 200 result)
- (d) a request **without** the `Mcp-Method` header fails cleanly (error object or HTTP ≥ 400)

Per-server table + exit 1 on any gap (`--json` for machine output).

### 2. Registry conformance badge — workers/mcp-registry

| Change | File:line |
|---|---|
| `ConformanceRecord` interface (`discover`/`resultType`/`headerEnforced`/`checkedAt`/`detail`) | src/index.ts:204-213 |
| `conformance?` field on `McpServerEntry` | src/index.ts:192-193 |
| KV prefix `conformance:` + `CONFORMANCE_TTL = 300` (5 min, 3 POSTs/server) | src/index.ts:665, :686 |
| `probeConformance` — raw-fetch, lazy, KV-cached, service-binding-first, same pattern as `probeHealth` | src/index.ts:1353-1431 |
| Wired into `summary()` → exposed on every `GET /servers` entry | src/index.ts:2064, :2100 |
| Exported via `__internal` for tests | src/index.ts:3204 |

Local (stdio) entries and upstream federation listings return `null`
(never probed) — same rule as `probeHealth`.

### 3. Reference doc — `docs/enterprise/architecture/agent-runtime-durable-objects.md` (NEW)

DO-based agent runtime as the estate reference: session state in
SQLite-backed DOs, included-allowance math (1M DO requests + 400k GB-s on
Workers Paid) vs DigitalOcean Agent Droplets ($50/$200) and AWS Bedrock
AgentCore ($0.0895/vCPU-hr), mermaid diagrams, and the real estate DOs with
file:line.

## Fleet results (2026-10-13, `node scripts/verify-mcp-conformance.mjs`)

**0/17 fully conformant.** Honest detail: the fleet splits into two eras.

| Server | discover | resultType | removed-method | header-enforced | Finding |
|---|---|---|---|---|---|
| bros, dads, design-mcp, marketplace-mcp, p31-crypto, p31-justice-hub, phenix-wallet | FAIL | ok | ok (-32601) | ok (-32020) | 2026-era, but discover omits top-level `protocolVersion` (returns `supportedVersions` + `serverInfo` in `_meta`) |
| x402-gateway | FAIL | ok | ok (-32601) | **FAIL** | omits `supportedProtocolVersions`; **silently succeeds without `Mcp-Method`** |
| music-maker-mcp, p31-mcp-server | FAIL | FAIL | ok (-32000) | ok | legacy era — rejects 2026-07-28 (`supported: 2025-11-25 … 2024-10-07`) |
| p31-shell | FAIL | FAIL | ok (-32603) | ok | `-32603 MCP server unavailable` on 2026-era discover |
| roblox-bridge | FAIL | FAIL | ok (404) | ok (404) | 404 on all stateless calls |
| spaceship-relay | FAIL | FAIL | **FAIL** | ok (-32601) | no `server/discover` (-32601); **`ping` returns a 200 `result:{}`** |
| vision-reviewer/layout/sensory/identity | FAIL | FAIL | ok (400) | ok (400) | phos-ai-proxy `/vision` returns 400 (not an MCP endpoint shape) |

Filed as follow-up work (out of scope for this leg): upgrade the
legacy-era servers to the 2026-07-28 stateless contract; add the missing
`protocolVersion` field to the modern servers' discover results; make
x402-gateway enforce `Mcp-Method`; make spaceship-relay return a JSON-RPC
error for unknown methods. The registry badge + script now make all four
drifts machine-visible — the sensor exists, the remediation is tracked.

**Update 2026-10-13:** all four remediations executed and resolved —
see `docs/fix-plans/conformance-remediation-wave-2026-10-13.md` (12/17
fully conformant, was 0/17; `mcp-health-check` 16/16). Residual honest
gaps (roblox-bridge 404, vision-* 400) are filed there with evidence.

## Evidence

- `node scripts/verify-mcp-conformance.mjs` → exit 1, 0/17 fully conformant
  (table above — the honest current state).
- Registry: `npx tsc --noEmit` clean; `npx vitest run` **110/110** (was
  106/106 — +4 conformance tests: conformant server, headerless-silent
  server, local null, `/servers` exposure; src/index.test.ts:490-558).
- Deployed: mcp-registry version d98fa382 (2026-10-13).
- Live: `GET https://mcp-registry.trimtab-signal.workers.dev/servers` now
  returns `conformance: {discover, resultType, headerEnforced, checkedAt,
  detail}` per remote entry, values matching the local probe (e.g.
  p31-crypto `{false, true, true}`, x402-gateway `{false, true, false}`,
  local entries `null`).
- `node scripts/mcp-health-check.mjs` → **16/16 healthy** after deploy.
- No portal edits: the marketplace portal's badge row can read
  `servers[].conformance` directly when it lands.