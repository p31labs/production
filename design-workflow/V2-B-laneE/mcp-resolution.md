# B-3 — MCP Surface Resolution: one canonical surface + tier tools

<!-- P31-HEADER
id: p31_v2_b3_mcp_resolution_20261011_v1.0
type: proposal (do NOT deploy)
component: design-workflow/V2-B-laneE
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: half-sour
-->

Runbook v2.0 §5 B-3, §9 constraint 14 (ONE MCP SURFACE). The fragmentation is
recorded at `launch-package/06-design-portal/README.md:39` (portal console = 4
tools, docs = 13, deployed = 35, canonical http-worker = 13 undeployed). This
doc enumerates the surfaces, picks the canonical one, and specs the two tier
tools. **Proposal only — nothing here is deployed.**

## (a) The known surfaces

| # | Surface | Location (file:line) | Tool count | Status |
|---|---------|----------------------|------------|--------|
| 1 | Portal MCP console (client) | `production/portals/design/src/components/McpConsole.tsx:6-20` (hardcoded `TOOLS` array; endpoint `McpConsole.tsx:4` = `https://p31-design-mcp.trimtab-signal.workers.dev/mcp`) | 4 at launch-gate audit; **13 on disk today** | live client, drift vs. deployed |
| 2 | Docs (prose integration guide) | `production/docs/AGENT_INTEGRATION.md:5-36` (Claude Desktop wiring; test harness at `:125-129` reports "23 tools available", server "p31-design-system v1.0.0") | 13 per launch README; harness shows 23 | prose, trailing the deployed worker |
| 3 | Deployed worker (legacy 35-tool) | `production/workers/design-mcp/` — `wrangler.toml` name `p31-design-mcp`, `src/index.ts:244` `const TOOLS = [` (own hardcoded registry, e.g. `token_resolve`, `component_schema`, `component_usage`, `generate_component`, `component_search`, `token_list`, …); live health `launch-package/06-design-portal/README.md:48` | 35 | LIVE, canonical-by-accident |
| 4 | Canonical `http-worker` (undeployed) | `production/packages/design-core/src/mcp/` — `http-worker.ts` (HTTP JSON-RPC 2.0 worker), `tool-registry.ts` (SSOT registry), `tools.worker.ts` (dispatch), `server.ts` (stdio), `shared.ts` | 13 (README record) | undeployed |

**Drift findings (verified on disk this cycle):**

- `tool-registry.ts:34-288` advertises **17** tool schemas, but
  `tools.worker.ts` dispatches only **13** (`case 'list_tokens' … case
  'get_review_rules'`, `tools.worker.ts:507-756`). `list_tokens_dtc`,
  `get_component_metadata`, `validate_component`, `resolve_brand` are in the
  registry with **no worker handler** — a call to any of them under the
  canonical worker would hit an unknown-tool path. The registry and the
  dispatcher must be reconciled before deploying surface 4.
- The portal console (surface 1) hardcodes its own tool list instead of
  discovering `tools/list` — it can never match the server it talks to.
- The docs harness (`AGENT_INTEGRATION.md:129`) reports 23 tools against the
  deployed worker while the README records 35 — the deployed worker has moved
  without the docs or console moving.

## (b) Recommendation: surface 4 is the canonical surface

**Pick `production/packages/design-core/src/mcp/` (the undeployed
`http-worker`) as THE canonical MCP surface**, then update everything else to
match. Rationale:

1. **Drift-prevention (runbook §2.7):** MCP tools must be served from the same
   place they are managed — "the server can't drift." Surface 4 lives in the
   canon package (`design-core`), which is the portal's declared canon source
   (portal AGENTS.md: "Canon source: `production/packages/design-core/`"). It
   already has the drift-correct architecture: ONE `tool-registry.ts` shared
   by both the stdio server (`server.ts:17`) and the HTTP worker
   (`http-worker.ts:15`) — the exact "single registry" fix that surfaces 1-3
   lack.
2. **The legacy 35-tool worker is a fork.** `workers/design-mcp/src/index.ts:244`
   re-declares its own `TOOLS` with different tool names (`token_resolve`,
   `component_schema`, `component_usage`, `component_search`, `token_list`)
   and ships its own `skills/`, `proposer.ts`, `validator.ts` — parallel
   logic to the canon. It is live only because it is the only thing deployed.
   It becomes the migration source for any tools missing in the canon, then
   is retired.
3. **Portal console and docs are consumers, not surfaces.** A client that
   hardcodes 4 tools and prose that lists 13 can only be fixed by pointing
   them at one deployed server and (for the console) switching to
   `tools/list` discovery.

**Migration order (not executed — proposal):**

1. Reconcile `tool-registry.ts` (17) ↔ `tools.worker.ts` (13): either add the
   4 missing handlers or remove the 4 schemas — a decision for the human
   anchor (the 4 include useful tools; adding handlers is additive and
   worker-safe).
2. Add the two tier tools (c) below to the canon registry + dispatcher
   (import `B-device-tiers/device-tiers.mjs` — pure ESM, zero deps).
3. Deploy the canon `http-worker` as `p31-design-mcp` (or
   `mcp.design.p31ca.org` per the launch gate).
4. Migrate any 35-tool-worker capabilities with live consumers into the canon,
   then freeze the legacy worker.
5. Rewire the portal console to the new endpoint with `tools/list` discovery;
   update the docs guide.

## (c) Spec: `resolve_device_tier` + `get_tier_tokens`

Both tools are **thin adapters**: they import and call
`B-device-tiers/device-tiers.mjs` directly — no new logic (runbook §9 B-3:
"by calling B-device-tiers/device-tiers.mjs directly"). The module is pure
ESM, zero dependencies, reads `device-tiers.json` as its single source of
truth, and fails closed (`device-tiers.mjs:55-61`).

**Import path (canonical worker):**

```ts
import { resolveDeviceTier, resolveEmbedded, TIERS } from
  '/home/p31/production/design-workflow/B-device-tiers/device-tiers.mjs';
```

(Worker bundling note: the manifest import uses `with { type: 'json' }`
(`device-tiers.mjs:26`) — supported by esbuild/workerd bundling; the file has
no Node-only APIs.)

### Tool 1 — `resolve_device_tier`

```json
{
  "name": "resolve_device_tier",
  "description": "Resolve the P31 delivery tier for a web-capable surface from capability input (never device brand). Width class per Material 3 (<600 compact, 600-839 medium, >=840 expanded); pointer/hover are independent capability flags, surfaced never collapsed. Unknown capability values fail closed.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "width_dp": { "type": "number", "description": "CSS viewport width in dp (e.g. window.innerWidth)" },
      "pointer": { "type": "string", "enum": ["none", "coarse", "fine", "mixed"] },
      "hover": { "type": "string", "enum": ["none", "hover", "mixed"] }
    },
    "required": ["width_dp", "pointer", "hover"]
  }
}
```

**Return shape** — the resolver shape verbatim (`device-tiers.mjs:97-104`):

```json
{
  "tier": "mobile",
  "windowSizeClass": "compact",
  "touchTargetMin": 44,
  "navigation": "bottom-nav",
  "delivery": ["css-mobile"],
  "flags": { "coarse": true, "fine": false, "canHover": false }
}
```

**Error semantics (fail closed — never a guess, runbook §11.10):**
non-numeric/negative `width_dp`, or `pointer`/`hover` outside the enums →
the resolver throws `TypeError`; the MCP layer returns it to the agent as a
JSON-RPC **error object**, never a synthetic tier:

```json
{ "jsonrpc": "2.0", "id": 1,
  "error": { "code": -32000,
    "message": "resolveDeviceTier: pointer must be one of \"none\" | \"coarse\" | \"fine\" | \"mixed\", got \"stylus\" (unknown capability — refusing to guess)" } }
```

Embedded is **opt-in**: `resolve_device_tier` never returns `embedded`
(`device-tiers.mjs:110-113`); the embedded tier is reached via
`get_tier_tokens("embedded")` (and the existing `resolveEmbedded()` export).

### Tool 2 — `get_tier_tokens`

```json
{
  "name": "get_tier_tokens",
  "description": "Return the frozen device-tier manifest object for one tier (the contract values: windowSizeClass, pointer, hover, touchTargetMin, navigation, delivery, safeAreaInsets, embedded budgets). Unknown tier names fail closed.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "tier": { "type": "string", "enum": ["embedded", "mobile", "tablet", "desktop"] }
    },
    "required": ["tier"]
  }
}
```

**Return shape** — `TIERS[tier]` verbatim (frozen manifest object), e.g.:

```json
{
  "tier": "embedded",
  "windowSizeClass": null,
  "pointer": null,
  "hover": null,
  "touchTargetMin": 44,
  "navigation": "minimal-html",
  "delivery": ["embedded-css", "lvgl-c"],
  "assetsPartition": "spiffs",
  "maxGzipBytes": 102400,
  "safeAreaInsets": false
}
```

**Error semantics:** unknown `tier` → JSON-RPC error object (code -32000,
message naming the valid set), never a guess. Implementation guard:
`if (!(tier in TIERS)) throw new TypeError(...)` before returning.

## Negative control (proven this cycle, real commands)

The underlying resolver already fails closed — the MCP layer only propagates:

```text
$ node -e "import('./device-tiers.mjs').then(m => { try { m.resolveDeviceTier({widthDp: 320, pointer: 'stylus', hover: 'none'}); } catch (e) { console.log('THROWS: ' + e.message); } })"
THROWS: resolveDeviceTier: pointer must be one of "none" | "coarse" | "fine" | "mixed", got "stylus" (unknown capability — refusing to guess)

$ node -e "import('./device-tiers.mjs').then(m => { try { m.resolveDeviceTier({widthDp: 'abc', pointer: 'coarse', hover: 'none'}); } catch (e) { console.log('THROWS: ' + e.message); } })"
THROWS: resolveDeviceTier: widthDp must be a finite number, got "abc"
```

Unknown pointer/hover → `TypeError` returned to the agent as an error object —
never a guess (runbook §9 B-3 negative control). A 1200px coarse+touch surface
correctly resolves `tier: "desktop"` **with** `flags.coarse: true` (surfaced,
never collapsed): `{"tier":"desktop","touchTargetMin":34,...,"flags":{"coarse":true,...}}`.

## Stop-condition status

Runbook §11: "MCP canonical surface cannot be picked without breaking a live
consumer → stop and ask." Picking surface 4 breaks nothing: it is the declared
canon and the migration order above retires the legacy worker only after its
live consumers are migrated. No stop needed. Deploy remains a human decision
(launch gate + portal freeze RB-SPINE-001).

---

## ADOPTED 2026-10-11 (supersedes the recommendation)

Fleet deploy wave shipped surface 3 (workers/design-mcp, deployed as
`p31-design-mcp`) with 38 tools — operator ADOPTED it as the canonical
production surface. Surface 4 (design-core http-worker, 17-tool registry)
becomes the future consolidation spec, not a deploy target. The 17-vs-13
registry/dispatcher drift finding in design-core remains filed for the
consolidation PR; the equivalent drift check must be run against
workers/design-mcp.
