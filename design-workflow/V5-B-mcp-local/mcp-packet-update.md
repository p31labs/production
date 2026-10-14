<!-- P31-HEADER
id: p31_v5_b4_mcp_packet_update_20261011_v1.0
type: packet-update (integrator instruction — text to APPEND to V4-handoffs/mcp.md)
component: design-workflow/V5-B-mcp-local
status: ready-for-integrator
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-b-v5
-->

# B-4 — MCP handoff packet update (exact text to append)

**For the integrator:** `V4-handoffs/mcp.md` is OUTSIDE Lane B's boundary
(runbook v5.0 §4 B-4; lane dir is `V5-B-mcp-local/` only). Append the section
below VERBATIM to `/home/p31/production/design-workflow/V4-handoffs/mcp.md`.
The rehearsal receipts referenced here are in
`V5-B-mcp-local/REHEARSAL-REPORT.md`.

---

## Text to append (verbatim, starts after the existing packet's last line)

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
`curl <canonical>/health` → tools count matches the SHIPPED surface (17
today; 5 after the surface PR if (a) lands), `tools/call resolve_device_tier`
{width_dp:390, pointer:"coarse", hover:"none"} → tier "mobile" — this check
only becomes meaningful after the surface decision (2a).

---