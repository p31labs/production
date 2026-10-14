<!-- P31-HEADER
id: p31_v3c_c1_p7_density_ranges_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: token-resilience-audit.md D-2-P3
-->

# C1-P7 · Density range policy (25 fixed-px spacing tokens)

**Status:** proposal · **Kind:** resilience policy migration (D-2)
**Extracted from:** `design-workflow/V2-D-designv2/token-resilience-audit.md` D-2-P3 (line 114)

## Problem

25 spacing tokens (`spacing-*`, `space-*`, `layout.spacing.*`) are fixed px
(2–64). M3 Expressive adaptive spacing changes density per tier; fixed px can't
follow. `space-micro` (4px) is the 1 density-stable invariant and stays fixed.

## Evidence (file:line)

- `design-workflow/V2-D-designv2/token-resilience-audit.md:43` — spacing row: 26 tokens, 25 POLICY, 1 fixed (`space-micro`)
- `design-workflow/V2-D-designv2/token-resilience-audit.md:114` — proposal D-2-P3

## Proposal

Density range per tier: `compact` / `medium` / `expanded` value per spacing
token; `space-micro` remains the invariant. Resolved via resolver tier + M3
adaptive spacing.

## Gate

`resilience-scan.mjs` — density-range rewrites pass clean; fixed-px spacing token flagged.

**Negative control:** fixed spacing fixture → flagged (exit 1).

**No canon file was modified by this proposal.**