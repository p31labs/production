<!-- P31-HEADER
id: p31_v3_b3_deploy_checklist_20261011_v1.0
type: checklist (handoff — do NOT deploy from this lane)
component: design-workflow/V3-B-mcp
status: ready-for-deploy-session
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-b
-->

# B3 — Deploy checklist: `p31-design-mcp-canonical`

Runbook v3.0 §5 B-3 + §9.16 (HANDOFF RULE: the lane prepares the ship; an
external worker-deploy session deploys). This artifact deploys the **canonical
design-core http-worker** (`packages/design-core/src/mcp/http-worker.ts` —
surface 4 of `V2-B-laneE/mcp-resolution.md`) under the name
`p31-design-mcp-canonical`.

## Predeploy — in order (all on-box, this lane's gates first)

1. **Drift reconciliation lands FIRST.** Run the drift sensor:
   `node design-workflow/V3-B-mcp/drift-detector.mjs`. It MUST exit 0. Today it
   exits 1 with 4 missing handlers (`list_tokens_dtc`, `get_component_metadata`,
   `validate_component`, `resolve_brand`). Apply `handlers-proposal.diff` in a
   design-core contribution PR, land + merge it, then re-run the sensor →
   exit 0. **Deploying before this makes `tools/list` advertise tools that the
   worker cannot dispatch.**
2. **Surface gate.** `node design-workflow/V3-B-mcp/surface-check.mjs` exits 0
   on the 5-tool public surface (`public-surface.json`). The 6-tool negative
   control must fail. The canonical worker serves the 5-tool surface; all other
   tools live in the implementation layer (runbook §9.17).
3. **Tier tools landed.** `resolve_device_tier` + `get_tier_tokens` adapters
   (`mcp-tiers.mjs`) pass their node:test suite (B4). They import the canon
   tier module via a bundle-safe relative path; the worker build must resolve
   it (esbuild + workerd handle the `with { type: 'json' }` manifest import).
4. **Artifact gate.** `node design-workflow/V3-B-mcp/deploy-check.mjs` exits 0:
   `wrangler.toml` has `name`, `main`, `compatibility_date`, and
   `main = ../../packages/design-core/src/mcp/http-worker.ts` exists.

## Deploy (external worker-deploy session)

5. **Dry-run first:** from `design-workflow/V3-B-mcp/`,
   `npx wrangler deploy --dry-run`. Gate: passes with no unresolved imports
   (missing handler/file → dry-run fails = the §5 B-3 negative control).
6. **Ship to a staging name**, then point the portal console at the new
   endpoint. The console (`portals/design/src/components/McpConsole.tsx:4`)
   hardcodes `https://p31-design-mcp.trimtab-signal.workers.dev/mcp` and its own
   tool list — it must be rewired to `tools/list` discovery against the
   canonical endpoint (this is a consumer change, separate from deploy).
7. **Migrate live consumers** of the legacy 35-tool worker
   (`workers/design-mcp/`, live at `p31-design-mcp.trimtab-signal.workers.dev`)
   onto the canonical surface: any 35-tool capability with a live consumer is
   ported into design-core first (additive), then the consumer flips.
8. **Retirement order:** (a) canonical worker live and serving all migrated
   consumers → (b) legacy worker frozen (no new deploys) → (c) legacy worker
   removed after a drain window → (d) the `p31-design-mcp` name is reclaimed
   by the canonical worker (or `mcp.design.p31ca.org` custom domain attached,
   per design-core/wrangler.toml:11-15 comment).

## Postdeploy verification

- `curl https://<canonical-host>/health` → `{ status: "ok", tools: 5 }`.
- `curl -X POST https://<canonical-host>/mcp` with
  `{"jsonrpc":"2.0","id":1,"method":"tools/list"}` → exactly the 5 tools of
  `public-surface.json`.
- `tools/call resolve_device_tier` with `width_dp: 390, pointer: coarse,
  hover: none` → `tier: "mobile"`; with `pointer: "stylus"` → JSON-RPC error
  object (code -32000), never a guessed tier.
- Docs (`production/docs/AGENT_INTEGRATION.md`) re-pointed to the canonical
  endpoint and re-verified (prose trails the deployed worker today).

## Stop conditions (runbook §11)

- Canonical surface cannot be picked without breaking a live consumer → stop
  and ask (checklist items 6-8 are the mitigation).
- `wrangler deploy --dry-run` fails → do not ship; fix on-box first.