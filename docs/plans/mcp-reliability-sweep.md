<!-- P31-HEADER
id: p31_mcp_reliability_sweep_20261004_v1.0
type: plan
component: workspace
status: live
retention: archive-90d
created: 2026-10-04T00:00:00Z
owner: will
-->

# Plan: MCP Reliability Sweep

## The work
- D1: Fix `scripts/mcp-health-check.mjs` — replace GET probe with POST initialize
- D2: Fix `scripts/mcp-restart.mjs` — same fix
- D3: Add negative control to `scripts/negative-controls.mjs` — prove probe fails on 502
- D4: Wire into `package.json` gate chain
- D5: Patch orchestrator rule in `AGENT-RUNBOOK-PART3.md` — "re-delegate, don't implement"
- D6: Merge PART2 + PART3 into canonical `AGENT-RUNBOOK.md` v3

## The traps
- A: Pattern-match — both files must be fixed, not just one
- B: False-completion — worker must paste actual `pnpm mcp:health` output
- C: Scope-creep — diff must touch only D1–D4 files
- D: Orchestrator — re-delegate on worker failure, never implement

## The gate
`pnpm gate` green, `pnpm mcp:health` reports x402-gateway as UNHEALTHY, 8/8 negative controls.
