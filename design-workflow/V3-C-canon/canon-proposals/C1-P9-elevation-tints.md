<!-- P31-HEADER
id: p31_v3c_c1_p9_elevation_tints_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: token-resilience-audit.md D-2-P5
-->

# C1-P9 · Elevation tint range policy

**Status:** proposal · **Kind:** resilience policy migration (D-2)
**Extracted from:** `design-workflow/V2-D-designv2/token-resilience-audit.md` D-2-P5 (line 116)

## Problem

`elevation-level1/2/3-tint` are fixed 0.05 / 0.08 / 0.11. Shadow darkness must
track the backdrop L — a fixed tint assumes a fixed surface. Filed separately
from the 89-token findings as shadow-policy candidates
(`token-resilience-audit.md:51`).

## Evidence (file:line)

- `design-workflow/V2-D-designv2/token-resilience-audit.md:51` — "+21 number-type tokens audited separately; elevation-*-tint are shadow policy candidates, filed as D-2-P5"
- `design-workflow/V2-D-designv2/token-resilience-audit.md:116` — proposal D-2-P5

## Proposal

Tint range keyed to surface L: shadow darkness tracks the backdrop. Resolved by
the resolver's surface class.

## Gate

`resilience-scan.mjs` — tint-range rewrites pass clean; a fixed elevation tint is flagged.

**Negative control:** fixed elevation-tint fixture → flagged (exit 1).

**No canon file was modified by this proposal.**