<!-- P31-HEADER
id: p31_v6_d_report_20261011_v1.0
type: lane-report (audit-grade)
component: design-workflow/V6-D-adoption
status: complete
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-d-v6
-->

# Lane D v6.0 — Adoption Instrumentation Report

Runbook: `DESIGN-SYSTEM-PARALLEL-PATHS-RUNBOOK-V6.md` §7 (WORKSTREAM D).
All writes confined to `V6-D-adoption/`. Zero npm installs. Node 24 ESM.
All consumer surfaces opened READ-ONLY. No edits to
`packages/**`, `portals/**`, `docs/**`, or `P31-local-workspace/**`.

## Deliverables

| ID | File | What it is |
|---|---|---|
| D-1 | `mcp-usage-proposal.md` | design-core PROPOSAL (never applied, mistake #10 honored): per-isolate usage counters appended to the rate-limit block at `http-worker.ts:39-53`, `GET /usage` snapshot shape, wire points by line, 3 negative controls |
| D-1 | `usage-logger.mjs` | local stand-in: **counter harness that wraps JSON-RPC calls to the local worker and counts them** (documented choice — see below) |
| D-2 | `compliance-scan.mjs` | zero-dep walker over the read-only consumer dirs; flags hex/rgba/px-on-scalable; `--fixtures` control mode |
| D-2 | `compliance-baseline.md` | generated per-surface counts + top 30 findings |
| D-3 | `adoption-baseline.json` | the four adoption signals, each with value + method + timestamp |
| — | `D-REPORT.md` | this file: gates table + negative controls + notes |

## D-1 — stand-in choice (documented)

Built the **counter harness**, not a log-tailer. Tailing wrangler-dev output
is brittle (ANSI, partial lines, format churn); wrapping the JSON-RPC calls we
make during rehearsal is deterministic and replayable. The harness fires
`tools/list` + `tools/call` for all 17 tools, counts per-tool calls/errors,
and prints the snapshot in the exact shape proposed in
`mcp-usage-proposal.md` §2. The REAL instrumentation is the proposal above —
it lands with the design-core PR (queued), not here.

**Rehearsal evidence (real worker, wrangler dev on :8787):**

```text
$ node usage-logger.mjs
tools/list → advertised tools: 17
  list_tokens: ok   resolve_token: ok   search_tokens: ok
  list_tokens_dtc: error                ← 4 unreconciled handlers
  list_components: ok   get_component: ok
  get_component_metadata: error         ← (v5 drift finding, reproduced)
  validate_component: error             ←
  resolve_brand: error                  ←
  generate_component: ok   list_recipes: ok   get_recipe: ok
  convert_component: ok   audit_css: ok   validate_parity: ok
  get_ui_principles: ok   get_review_rules: ok
snapshot: requests=18, 13 calls ok, 4 errors (the 4 unknown-tool handlers)
```

First rehearsal run flagged `convert_component` as an error because the
harness sent incomplete args (`Missing required args: source, target, code,
componentName` — the worker's own validation, working as designed). Fixed the
ARGS map; re-run shows 13 ok / 4 unknown-tool errors, matching the v5
drift-detector finding exactly. Honesty note: the first-run harness defect is
recorded here, not silently patched out of history.

## D-2 — negative control evidence (pasted)

```text
$ node compliance-scan.mjs --fixtures
=== NEGATIVE CONTROL (planted hex + rgba + px must ALL be flagged) ===
{ "file": "negative-control.tsx", "hex": 4, "rgb": 2, "px": 2,
  "samples": { "hex": ["#AABBCC","#ABC","#AABBCCDD"],
               "rgb": ["rgba(1","rgba(1"], "px": ["font-size: 16px","fontSize: '16px'"] } }
NEGATIVE CONTROL: PASS (all three violation classes flagged)

=== POSITIVE CONTROL (token-only file must flag NOTHING) ===
{ "file": "positive-control.css", "hex": 0, "rgb": 0, "px": 0, ... }
POSITIVE CONTROL: PASS (zero false positives)
```

Real scan summary:

```text
design-portal-src:      files=70  clean=54  hexFiles=0(0)      rgbFiles=0(0)     pxFiles=16(61)
p31ca-public:           files=153 clean=5   hexFiles=127(2045) rgbFiles=86(1378) pxFiles=91(946)
ws-planetary-planet:    files=16  clean=12  hexFiles=4(19)     rgbFiles=1(3)     pxFiles=1(1)
total flagged files: 168   → compliance-baseline.md (top 30 findings + counts)
```

Headline: the design portal is **color-clean** (0 raw hex/rgba across 70
files) but has 61 px-on-scalable hits; `p31ca-public` is the main raw-color
surface (2045 hex hits, incl. `p31-core.css :root` hex token definitions and
Tailwind `p31-tw.css`); planetary-planet is nearly clean (19 hex hits).
Classification note: px inside `var(--p31-radius-*, <px>)` FALLBACK values is
flagged too — token fallbacks are still raw px in consumer code, but they sit
closer to the token tier than hardcoded font-sizes; kept flagged for honesty.

## D-3 — adoption baseline (four signals)

See `adoption-baseline.json` (each signal: value + method + timestamp):

1. **Version currency — CURRENT.** Vendor tarball `p31-design-core-3.0.1.tgz`
   == canon package version 3.0.1 (older 2.1.0/2.2.0/2.3.0 tgz are history).
   FINDING: MCP `SERVER_VERSION` constant is `2.2.0` (`tool-registry.ts:16`)
   and `/health` reports it — metadata lag to fix in the design-core PR.
2. **Component consumption.** Design portal: 48 `from '@p31ca/design-core…'`
   imports in 31 files; 15 unique composition components (Button … Topbar) +
   submodules (genui/catalog ×8, theme-store ×7, jitterbug ×2, mcp/data ×2,
   agentic ×1). p31ca-public: 0 package imports (copied CSS instead).
   planetary-planet: 0 (no canon dependency).
3. **Token compliance.** D-2 counts above.
4. **Pattern adherence.** `data-theme`/`data-spoons` surfaces: design portal 6
   files, p31ca-public 9 files, planetary-planet 0.

## GATES RUN

| Gate | Command | Result | Negative control |
|---|---|---|---|
| D-1 proposal exists | `test -f mcp-usage-proposal.md` | PASS | n/a (document, not a gate) |
| D-1 stand-in rehearsal | `node usage-logger.mjs` vs live worker | PASS — 18 reqs counted, 17-tool matrix | worker down → harness exits 1 (PASS) |
| D-1 rate-limit count | `node usage-logger.mjs --rate-limit` | PASS — 65 reqs → 44×429 counted | no 429 → exit 1 (gate is real) |
| D-1 expect-down | `MCP_URL=http://localhost:8799 node usage-logger.mjs --expect-down` | PASS — connection refused, exit 1 | server up → exit 1 (gate is real) |
| D-2 planted violations | `node compliance-scan.mjs --fixtures` | PASS — hex 4, rgb 2, px 2 all flagged | positive control: 0/0/0 (no false positives) |
| D-2 real scan | `node compliance-scan.mjs` | PASS — 239 files, 168 flagged, baseline written | fixture scan is the control |
| D-3 baseline exists | `test -f adoption-baseline.json` | PASS — 4 signals, value+method+timestamp each | n/a (baseline, not a gate) |

## Notes (handoff to the integration lane)

- **D-1's real instrumentation lands with the design-core PR (queued).** This
  lane produced the proposal + stand-in only. After the PR lands and the canon
  deploy happens, re-running `usage-logger.mjs` against the deployed worker
  validates the counter shape against production.
- **Re-running D-2 after canon adoption is the drift check** (runbook §7
  D-2/D-3): `node compliance-scan.mjs` against the same surfaces; any
  NEW raw hex/rgba/px in `design-portal-src` or a rising p31ca-public count
  vs this baseline is a drift finding, not furniture.
- **Rehearsal compat-date deviation (disclosed):** canonical toml asks
  `2026-08-21`; the global wrangler 4.112.0 workerd supports ≤ `2026-07-21`
  and hard-errors. The local rehearsal toml copy (`.wrangler-dev/wrangler.toml`,
  inside this lane's dir) lowers it for the local boot only — the same
  fallback the v5 rehearsal got from wrangler 3.x. Canon toml untouched.
- **Findings surfaced (not fixed here):** (1) `SERVER_VERSION` 2.2.0 lag;
  (2) 4 unreconciled handlers still "Unknown tool" (v5 finding, reproduced
  live); (3) p31ca-public is 96.7% non-clean (148/153 files) — the biggest
  adoption-drift target once canon tokens are the enforced consumption path.