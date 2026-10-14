<!-- P31-HEADER
id: p31_fix_plan_marketplace_mcp_do_gaps_20261011_v1.0
type: fix-plan
component: workers/marketplace-mcp
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# fix-plan: marketplace-mcp-do-integration-gaps

**Discovered by:** agent:subagent:marketplace-frontend-upgrade (W-session)
**Discovered at:** 2026-10-11T00:00:00Z
**Severity:** medium

## The findings

Three gaps remain in `workers/marketplace-mcp` after the unbreak + protocol
upgrade (all filed, none blocking this workstream):

1. **Dangling symlink `src/marketplace-catalog`.** It pointed at
   `/home/p31/P31-local-workspace/workers/marketplace-catalog/src`, which moved
   away. The import now uses a real relative path
   (`../../marketplace-catalog/src/index`) and `tsconfig.json` carries a
   `paths` mapping, so nothing references the symlink anymore. The symlink
   itself is left in place: the harness forbids deleting files without the
   diff-before-delete decision (STATE.md), so removal needs a human sign-off.

2. **Embedded DO instance env gaps.** marketplace-mcp's `wrangler.toml`
   declares `MarketplaceCatalogDO` as its own DO binding, but the embedded DO
   reads `this.env.LOVE_LEDGER_URL` and `this.env.JUSTICE_HUB_URL`, neither of
   which is defined in marketplace-mcp's `wrangler.toml` `[vars]`. Every
   outbound DO action (SBT mint on trade completion, justice-hub escrow
   release, ODR offer forwarding on dispute) silently no-ops in the empty
   `catch` blocks. Phase-1 semantics work (DO-local records are written) but
   the LOVE/justice side effects never fire from this worker's DO instance.

3. **justice_evidence_deposit wire-up.** `marketplace_dispute` (tool) writes
   the DO-local dispute record via `POST /trade/:id/dispute` and returns the
   evidence hash, but the MCP layer has no justice-hub binding to forward
   evidence to p31-justice-hub's `justice_evidence_deposit` (seal hash into
   DO chain-of-custody). The embedded DO only attempts `justice_odr_offer`.
   Wire-up = add `JUSTICE_HUB_URL` to `[vars]` (fixes 2) + have the MCP
   worker POST `justice_evidence_deposit` with `{ caseId, evidenceHash }`
   before/after the DO dispute call.

## The fix

1. Delete `src/marketplace-catalog` symlink after the diff-before-delete check
   (human decision).
2. Add `LOVE_LEDGER_URL` and `JUSTICE_HUB_URL` to marketplace-mcp
   `wrangler.toml` `[vars]` so the embedded DO's outbound calls actually fire.
3. Add the justice_evidence_deposit forward in `executeTool`'s
   `marketplace_dispute` case (guarded, degrade-gracefully), matching the DO's
   existing pattern.

## The gate

`marketplace_confirm` on a completed trade shows an SBT mint attempt in
ledger-bridge logs; `marketplace_dispute` shows both the DO dispute record and
a justice-hub chain-of-custody entry for the evidence hash.