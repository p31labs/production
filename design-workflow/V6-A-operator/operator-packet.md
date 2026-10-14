# Lane A — Operator Action Packet (v6.0, rehearsal-proven)

<!-- P31-HEADER
id: p31_v6_laneA_operator_packet_20261011_v1.0
type: operator-packet
component: design-workflow/V6-A-operator
status: ready — OPERATOR executes in order; ORDER RULE binds
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

Every step was rehearsed in v5.0 (canon merge replay byte-identical
`a07f6702…`; MCP dry-run pass with live auth; drift reconciliation proven
17=17). Each step = command + verification. Do NOT reorder. Record each
verification output to `/tmp/opencode/v6-operator-evidence.log`.

## Surface decision (recorded — SUPERSEDED)

**RATIFIED 2026-10-11: 17 tools now → SUPERSEDED same day:** the fleet deploy
wave shipped `p31-design-mcp` (workers/design-mcp) at **38 tools** and the
operator ADOPTED it as canonical. The design-core worker deploy (old steps
2–4 below) is RETIRED. New steps 2–4 supersede.

## Step 1 — Canon merge (the 6-step list)

Source of truth: `V5-A-canon-sandbox/REHEARSAL-REPORT.md` §A-6.

1a. Baseline + backup:
```bash
cd /home/p31/production && sha256sum packages/canon/tokens/tokens.dtc.json > /tmp/opencode/merge-baseline.sha256 \
  && cp -p packages/canon/tokens/tokens.dtc.json /tmp/opencode/backup-tokens.dtc.json
```
VERIFY: hash == `2ed16e75…` (drift check).

1b. Apply F1 + F2:
```bash
node design-workflow/V3-C-canon/canon-diff/apply-patches.mjs packages/canon/tokens/tokens.dtc.json \
  design-workflow/V3-C-canon/canon-diff/C3-F1-sunlight-text.patch.json \
  design-workflow/V3-C-canon/canon-diff/C3-F2-extensions-themes-equals-11.patch.json
```
VERIFY: extensions entries 239→264; sunlight.p31 keys 23→22; 0 unexpected diffs.

1c. Apply deltas (replay-proven):
```bash
node design-workflow/V5-A-canon-sandbox/operator-apply-deltas.mjs packages/canon/tokens/tokens.dtc.json
```
VERIFY: `OPERATOR DELTAS RESULT: PASS` — 11/11 versionPolicy, 70/70 rewrites,
6 elevation tints, 0 findings, 76/76 descriptors; sha256 of the file == `a07f6702…`.

1d. Close-the-loop Group 1 (from `V5-C-closeloop/close-the-loop.md`):
token-audit (cwd design-core) → validates-v3 fixture → policy-scan → dtcg-shape
→ emitter + parity. VERIFY: all exit 0; negative controls still fail.

## Step 2 — Design-core PR (consolidation spec, not deploy) — SUPERSEDED by adoption

`handlers-proposal.diff` + the 17-tool registry stay as the consolidation
spec for a FUTURE shrink PR against workers/design-mcp. No deploy urgency.

## Step 3 — Adopted surface checks (in place of the old deploy)

The canonical worker is already deployed. Verify instead:
```bash
curl -s https://p31-design-mcp.trimtab-signal.workers.dev/health
# → {"status":"healthy","components":32,"tools":38}
```
VERIFY: tools == 38; `tools/list` (with `accept: application/json, text/event-stream`) returns 38.

## Step 4 — Console discovery switch (portal change, RB-SPINE-001)

`McpConsole.tsx:4` already points at the canonical URL — the remaining change
is switching the hardcoded TOOLS array to `tools/list` discovery. Portal
override required; verify the console lists 38 tools post-change.

## Step 5 — Close-the-loop Group 2 (from close-the-loop.md)

drift exit 0 · health tools:17 · console discovery · legacy worker drain scheduled.

## Step 6 — Close the loop

`node design-workflow/V4-run-all-gates.mjs` + V5 + V6 suites → all exit 0;
update `V5-C-closeloop/baseline.json` with post-adoption hashes + receipt.