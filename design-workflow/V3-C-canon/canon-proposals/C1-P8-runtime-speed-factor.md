<!-- P31-HEADER
id: p31_v3c_c1_p8_runtime_speed_factor_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: token-resilience-audit.md D-2-P4
-->

# C1-P8 · Runtime speed factor (16 fixed-ms motion tokens)

**Status:** proposal · **Kind:** resilience policy migration (D-2)
**Extracted from:** `design-workflow/V2-D-designv2/token-resilience-audit.md` D-2-P4 (line 115)

## Problem

16 motion durations are fixed ms (`duration-*`, `duration-base` 431ms,
`spring-*-ms`, 62.5–1000ms). Fixed durations ignore `prefers-reduced-motion`
(user-controlled). The old `speed-factor: 1` (number, deprecated) multiplier
**existed and was removed** — this proposal restores it as a runtime multiplier,
with reduced-motion resolving to **instant** (durations 0), never a CSS
override downstream.

## Evidence (file:line)

- `design-workflow/V2-D-designv2/token-resilience-audit.md:45` — motion row: 36 tokens, 16 POLICY (fixed ms), 20 stable cubicBezier
- `design-workflow/V2-D-designv2/token-resilience-audit.md:47` — duration subset row (16)
- `design-workflow/V2-D-designv2/token-resilience-audit.md:115` — proposal D-2-P4

## Proposal

Base durations × runtime speed factor; `prefers-reduced-motion` → instant.
Resolved by the media context (user-controlled), flags surfaced at resolution
time, never collapsed into a fixed value (resolver doctrine,
`token-resilience-audit.md:118-127`).

## Gate

`resilience-scan.mjs` — speed-factor rewrites pass clean; a fixed-ms duration token is still flagged.

**Negative control:** fixed-ms fixture → flagged (exit 1).

**No canon file was modified by this proposal.**