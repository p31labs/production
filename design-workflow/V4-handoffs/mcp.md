# Handoff Packet 2 — MCP canonical worker deploy

<!-- P31-HEADER
id: p31_v4_handoff_mcp_20261011_v1.0
type: handoff-packet
component: design-workflow/V4-handoffs
status: ready — external worker session required (Cloudflare auth)
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

**Session prerequisite:** Cloudflare account with Workers auth. `wrangler`
exists on-box (nvm v24.16.0) — the `--dry-run` gate is runnable here; the
real deploy needs credentials.

**Inputs (hashes in `V4-D-design-ci/V4-handoff-manifest.json`):**
- `design-workflow/V3-B-mcp/wrangler.toml` (name `p31-design-mcp-canonical`, main → design-core `src/mcp/http-worker.ts`)
- `design-workflow/V3-B-mcp/handlers-proposal.diff` (the 4 missing handlers — lands FIRST as a design-core PR)
- `design-workflow/V3-B-mcp/public-surface.json` (5-tool surface)
- `design-workflow/V3-B-mcp/mcp-tiers.mjs` (fail-closed tier adapters, 7/7 tests)
- `design-workflow/V3-B-mcp/deploy-checklist.md` (ordered steps)

**Steps (ORDER RULE — nothing ships out of order):**
1. **B-1** Land `handlers-proposal.diff` in design-core; `node drift-detector.mjs` must exit 0 (17=17) BEFORE any deploy.
2. **B-2** `npx wrangler deploy --dry-run` → `npx wrangler deploy` (Streamable HTTP, stateless).
3. **B-3** Repoint `portals/design/src/components/McpConsole.tsx:4` (legacy URL) → canonical endpoint; hardcoded tool list → `tools/list` discovery.
4. **B-4** Retire the legacy 35-tool worker after a drain window.

**Gates:**
- pre-deploy drift exit 0 → NEG: 17-vs-13 mismatch → fail
- `wrangler deploy --dry-run` passes → NEG: missing handler → fail
- post-deploy `curl /health` → `{ status:"ok", tools:5 }` → NEG: tools ≠ 5 → fail

**Auth:** none now (public data). OAuth proxy (`workers-oauth-provider`) is the upgrade path.

**Report back in the runbook status format.**

---

## Verified status — v5.0 Lane B rehearsal (2026-10-11, on-box)

Rehearsal completed on-box with real auth (`wrangler whoami` → OAuth,
`trimtab.signal@proton.me`). Receipts: `V5-B-mcp-local/REHEARSAL-REPORT.md`.

- **B-1 drift rehearsal: PASS.** `handlers-proposal.diff` applied to a temp
  mirror of `design-core/src/mcp/` (sha256-verified copies);
  `drift-detector.mjs` against (registry, patched dispatch) → **exit 0,
  17=17**. Negative control: pristine copy → exit 1 (17-vs-13, 4 missing).
- **B-2 local server: PASS with finding.** `wrangler dev --port 8787` boots
  the TS module worker. `/health` → `{"status":"ok","service":"p31-design-mcp","version":"2.2.0","tools":17}`.
  **FINDING:** the canonical worker serves the 17-tool registry surface, NOT
  the 5-tool surface promised by `public-surface.json`. `tools/list` returns
  17 tools; `tools/call resolve_device_tier` returns
  `{"result":{"content":[{"type":"text","text":"Unknown tool: resolve_device_tier"}],"isError":true}}`
  (fail-closed holds: error object, never a guess — but the tier resolution
  itself is absent; `mcp-tiers.mjs` was never wired into design-core).
  Negative control: server killed → curl exit 7 (connection refused).
- **B-3 dry-run: PASS (both wranglers).** `wrangler deploy --dry-run`
  → `Total Upload: 144.95 KiB / gzip: 30.80 KiB`, `--dry-run: exiting now.`
  (wrangler 4.112.0 global; npx-resolved 3.114.17 also passes).
  Negative control: broken `main` in a temp toml → entry-point not found,
  exit 1.

**Deploy remains operator-gated on two open items (ORDER RULE — do NOT ship
before both):**

1. **Land the reconciliation first.** `handlers-proposal.diff` is still NOT
   applied in design-core (live worker demonstrably advertises
   `list_tokens_dtc` / `get_component_metadata` / `validate_component` /
   `resolve_brand` via `tools/list` and returns "Unknown tool" for each).
   PR lands in design-core → `node drift-detector.mjs` on REAL canon must
   exit 0 before any deploy.
2. **Resolve the surface decision.** Either (a) wire the 5-tool surface
   (`public-surface.json` + `mcp-tiers.mjs` adapters) into design-core's
   registry/worker, or (b) formally revise this packet + runbook v5.0 §4 B-2
   to the 17-tool surface. Until then the post-deploy gate
   `curl /health → tools: 5` CANNOT pass — the worker serves tools: 17.

**The one remaining operator command** (after items 1–2 land), from
`design-workflow/V3-B-mcp/`:

```
npx wrangler deploy
```

(On-box authenticated; wrangler 4.112.0 is the global binary. npx resolves
3.114.17 from `/home/p31/node_modules` — pin with `npx wrangler@4.112.0
deploy` if exact version matters.)

**Console-repoint step** (unchanged from packet B-3): after deploy,
`portals/design/src/components/McpConsole.tsx:4` hardcodes
`https://p31-design-mcp.trimtab-signal.workers.dev/mcp` and its own tool
list — rewire to `tools/list` discovery against the canonical endpoint.

**Post-deploy verification** (from deploy-checklist.md §Postdeploy):
`curl <canonical>/health` → **tools: 17** (surface RATIFIED 17 by operator
2026-10-11 — runbook v6.0 §8; the 5-tool spec remains the north star for a
later shrink PR). `tools/call resolve_device_tier` becomes meaningful after
the tier-tool wiring PR (queued, not deploy-blocking).

---


---

## SUPERSEDED 2026-10-11 — canonical surface ADOPTED: the deployed worker

The fleet deploy wave shipped `p31-design-mcp` (workers/design-mcp) with
**38 tools + 32 components**, healthy, fleet-integrated, Streamable HTTP
(verified live: `/health` → `{"status":"healthy","components":32,"tools":38}`;
`tools/list` SSE-framed, `token_resolve` first). Operator decision:
**this is the canonical production surface.** The design-core http-worker
deploy plan (B-1..B-4 above) is RETIRED; `wrangler.toml` +
`handlers-proposal.diff` are repurposed as the consolidation spec.

Remaining work moves to the fleet facet:
1. Add `resolve_device_tier` + `get_tier_tokens` to workers/design-mcp (thin
   adapters over `B-device-tiers/device-tiers.mjs`, fail-closed).
2. Drift check against workers/design-mcp's own registry/dispatcher (38
   advertised — all dispatched?).
3. Console (`McpConsole.tsx:4` already points here) — switch the hardcoded
   tool list to `tools/list` discovery (portal change, RB-SPINE-001 override
   required).
4. Future consolidation: shrink the surface per the design-core 17-tool spec.
