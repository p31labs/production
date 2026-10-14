# C-1 — Close-the-Loop Procedure (first-class, v5.0)

<!-- P31-HEADER
id: p31_v5_closeloop_20261011_v1.0
type: procedure
component: design-workflow/V5-C-closeloop
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

The v4.0 footnote ("re-run all suites after external sessions land") promoted
to a gated, owned procedure. The loop closes only when ALL FOUR acceptance
groups pass. Drift against `baseline.json` at any step is a finding, not a
proceed signal.

## Group 1 — Canon lands (design-core merge complete)

Owner: operator (design-core maintainer). Run AFTER the C-1..C-4 merge of the
canon handoff packet.

| # | Check | Command | Must |
|---|---|---|---|
| 1.1 | OKLCH stance | `node packages/design-core/scripts/token-audit.mjs` (cwd: design-core) | exit 0 |
| 1.2 | Governance R1–R6 | `node design-workflow/V3-C-canon/validates-v3.mjs` (against REAL canon) | 11/11 versionPolicy, exit 0 |
| 1.3 | DTCG shape | `node design-workflow/V2-C-ci/dtcg-shape-audit.mjs` | exit 0 |
| 1.4 | Cross-target parity | `node design-workflow/V2-C-ci/cross-target-parity.mjs` | exit 0 |
| 1.5 | Emitter regen | `node design-workflow/A-token-pipeline/tier-emitter.mjs --target all` | exit 0 |
| 1.6 | Baseline diff | canon sha256 vs `baseline.json` | recorded as EXPECTED change (adoption), with the PR ref |

## Group 2 — MCP ships (canonical worker deployed)

Owner: operator (Cloudflare). Run AFTER the packet's B-1..B-4.

| # | Check | Command | Must |
|---|---|---|---|
| 2.1 | Drift reconciled | `node design-workflow/V3-B-mcp/drift-detector.mjs` | exit 0 (17=17) |
| 2.2 | Health | `curl <canonical-url>/health` | `{ status:"ok", tools:5 }` |
| 2.3 | Console rewire | `McpConsole.tsx:4` → canonical URL; tools discovered via `tools/list` | 5 tools listed |
| 2.4 | Legacy drain | no live consumers on the 35-tool worker | retire scheduled |

## Group 3 — Firmware ships (Node Zero flashed)

Owner: hardware session. Run AFTER packet A-1..A-4.

| # | Check | Command | Must |
|---|---|---|---|
| 3.1 | Served UI | `curl http://<ip>/` | packed UI at `/` |
| 3.2 | Status API | `curl http://<ip>/api/status` | contract JSON |
| 3.3 | OTA | dual-slot scheme + rollback confirmed in build | yes |

## Group 4 — The loop closes

| # | Check | Command | Must |
|---|---|---|---|
| 4.1 | Full suites | `node design-workflow/V1-run-all-gates.mjs` … V5 | all exit 0 |
| 4.2 | Live-artifact checks | groups 1–3 all pass in the SAME run | yes |
| 4.3 | Baseline re-freeze | `baseline.json` updated with post-adoption hashes + session receipt | recorded |

## Failure semantics

Any failing check → stop, write the finding, fix, re-run the GROUP (not the
whole loop). The loop does not partially close.