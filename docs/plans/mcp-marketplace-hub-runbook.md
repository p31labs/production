<!-- P31-HEADER
id: p31_runbook_mcp_marketplace_hub_20261011_v1.0
type: runbook
component: portals/mcp-marketplace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# P31 Marketplace Hub — Enterprise Parallel Paths Runbook v1.0

**Authority:** AGENT-RUNBOOK.md + AGENTS.md win over this file. Predecessor:
the x402/enterprise-MCP/marketplace mega-wave (26 servers migrated, 11
deployed, `mcp:health` 16/16).

## 0. Mission

Converge the deployed P31 MCP estate into a sovereign marketplace hub:
per-server storefronts, interactive playground (raw JSON-RPC + LLM test
console), tabbed install configs, `p31 publish` CLI, enterprise governance
(approval gates, per-tool analytics, SBOMs). Glama's inspector + Smithery's
publish + Docker's governance — sovereign edition.

## 1. Decisions (locked 2026-10-11, Will)

- **Storefront scope:** fleet + any URL (paste-and-inspect, Glama-style).
- **AI Test Console:** multi-LLM configurable — default local LiteLLM
  (:4001), settings panel for provider switch/disable.
- **Positioning:** **parallel paths — same surface, two lenses** (runbook
  §14 option a): unauthenticated public lens (catalog + storefronts +
  playground) and authenticated governed lens (approvals, private servers,
  analytics, publish).
- **Pricing surface:** storefronts show x402 price tiers (gateway PRICING)
  + LOVE settlement badges.

## 2. Research basis (sealed)

- Official Registry = metadata standard; unauthenticated read-only REST API
  `https://registry.modelcontextprotocol.io` (aggregators scrape ~hourly).
  Consume as upstream, never compete. (FEDERATE-DON'T-COMPETE RULE)
- WSO2 playground = client-side React component pattern; mcp-live-playground
  = CodePen pattern (tool inspector, LLM-agnostic console, snapshots).
- Smithery = CLI publish (`mcp publish <url|bundle>`) + tabbed installs.
- Docker = signed SBOMs + approval catalogs + version pinning.
- Governance pattern: Agent → Registry → Policy → Approval Gate → Target;
  Azure API Center "governed registration" (shadow-MCP prevention).
- Glama = raw JSON-RPC logging + per-tool control + ephemeral inspector.

## 3. Lanes

| Lane | Path | Notes |
|---|---|---|
| A | Data federation (registry) | official API upstream, governance metadata, catalog |
| B | Storefronts (portal) | `server/:id` rebuild + inspect-any-URL + dual lens |
| C | Playground depth (portal) | raw JSON-RPC, schema forms, snapshots, LLM console |
| D | Install + publish (portal + CLI) | tabbed configs, `p31 publish` → `.p31-mcp.json` |
| E | Enterprise (registry + bridge + scripts) | approval flag, usage counters, SBOM, audit |

## 4. Workstream detail

**A — Data federation** (workers/mcp-registry):
A-1 consume `GET /v0/servers` (KV cache, hourly TTL); A-2 catalog entries
gain `source: p31|official|external` + governance metadata (role, oauth
{enabled, resource, authorization_servers}, protocol, tools live-probed,
health, price_tier from gateway PRICING); A-3 phosphorus31
`/.well-known/mcp-servers.json` carries the same.
NC: malformed upstream response → log + skip, never crash.

**Status 2026-10-11 (Lane A)**: ✅ A-1/A-2/A-3 landed + deployed (mcp-registry
+ phosphorus31). Upstream scraped hourly into KV (`upstream:official`, TTL
3600); merge dedupes by name/isLatest, caps at 300, P31 wins id collisions.
Negative control proven (unit tests + live). Filed:
`registry-oauth-metadata-backfill.md`,
`registry-upstream-probe-volume-policy.md`.

**B — Storefronts** (portal): B-1 `server/:id` = hero + live badges
(health/protocol/OAuth/tools/price) + tool explorer + embedded playground +
install tab; B-2 inspect-any-URL on Discover; B-3 dual lens (public default,
governed via auth flag — Access wiring filed as follow-up).
NC: dead URL → degraded badge, no crash.

**C — Playground** (portal): C-1 raw JSON-RPC req/resp per call; C-2
schema-annotated forms (type/description/enum/default); C-3 shareable
session snapshots (.json export/import); C-4 LLM Test Console (default
LiteLLM :4001, configurable, clean disabled state).
NC: LLM backend disabled → explicit "backend unavailable" state.

**D — Install + publish**: D-1 tabbed install configs (Claude Code/Desktop/
VS Code/raw JSON); D-2 `cli/p31-publish.mjs` → probes deployed worker →
`.p31-mcp.json` manifest → registry `POST /servers`; D-3 Publish tab accepts
manifest upload + preview.
NC: manifest missing `name` → clear validation error.

**E — Enterprise**: E-1 `approval: approved|pending|blocked` +
admin-gated `POST /servers/:id/approve` (shared admin secret; Access later);
E-2 usage counters — bridge POSTs `{server, tool}` to registry
`POST /internal/usage` (internal secret, D1 table), registry serves
`GET /analytics/tools` (governed lens); E-3 `scripts/gen-sbom.mjs` →
CycloneDX per worker; E-4 audit entries (approval/publish) with SIEM fields.
NC: missing dep → SBOM marked incomplete, no crash.

**Status 2026-10-11 (Lane E, registry side)**: ✅ E-1 + E-2 (registry) +
E-4 ledger SIEM fields landed. Bridge contract (honored exactly): `POST
/internal/usage` body `{server, tool}` (optional `count`), header
`X-Internal-Usage-Key` (INTERNAL_USAGE_KEY — value in
workers/mcp-registry/.dev.vars + `wrangler secret`); upsert into D1
`usage_events` (migration 0001, db `mcp-registry-usage`); `GET
/analytics/tools` behind ADMIN_SECRET. Approval/publish/usage-admin events
append to the DO/D1 transparency ledger with timestamp/identity/server/tool/
outcome. Access successor filed: `registry-access-gate-follow-up.md`. E-3
SBOM + bridge write-side are parallel-agent lanes.

## 5. Gates (v1.0)

federation-merge · storefront-render · playground-jsonrpc · publish-manifest ·
approval-state · usage-counter · sbom-generate — each with a proven negative
control; full suite = existing `pnpm gate` + `mcp:health` 16/16 + portal
gates + registry 75/75.

## 6. Stop conditions

Official API down → skip + log (P31-only catalog). Storefront fails on a live
server → stop, fix probe. Playground can't capture raw JSON-RPC → not a
playground. SBOM can't be generated → mark incomplete + file fix-plan, never
silent. Gate without negative control → furniture.

## 7. Schedule

Wave 1 (parallel): Lane A+E(registry) ∥ Lane B+C+D(portal) ∥ Lane D-2+E-2
(write)+E-3 (CLI/bridge/scripts). Wave 2: deploy portal + registry, gates,
live checks. Wave 3: close-out (STATE.md, fix-plans, tracker).

## 8. Open (owner)

Gateway Secrets Store token (deploy-blocked LOVE path) · CIMD flag ·
Cloudflare Access wiring for governed lens + publish gate (filed).

## 9. Wave status (2026-10-11/12)

- **Lane A** ✅ deployed — official upstream federation (hourly KV cache,
  aggregator etiquette verified), governance metadata live on `/servers` and
  phosphorus31 `/.well-known/mcp-servers.json`, 106/106 tests.
- **Lane B** ✅ deployed — storefronts, inspect-any-URL, dual lens (public/
  governed), live negative controls.
- **Lane C** ✅ deployed — raw JSON-RPC views, schema forms, snapshots,
  multi-LLM console (LiteLLM unprovisioned → explicit unavailable state).
- **Lane D** ✅ — `p31 publish` CLI live-verified (1042 bypass shipped),
  tabbed installs, publish tab, manifest validation.
- **Lane E** ✅ — approval gate + audit (SIEM), usage counters live
  end-to-end (bridge → `/internal/usage` → D1 → `/analytics/tools`), fleet
  CycloneDX SBOM (161 components, 11/11 deployed workers).
- **Cross-lane closes:** registry 1042 liveness fix + bridge usage-key
  wiring, both resolved with live evidence.
- Gates: `fix-plan-scan` pass · `frontmatter` clean (87) · `mcp:health`
  16/16 · portal 20/20 (24/24 with live NCs) · canon forks 0.
- **Follow-ups filed:** Access wiring, LiteLLM provisioning, `/inspect` CORS
  proxy, OAuth metadata backfill, upstream probe volume policy.