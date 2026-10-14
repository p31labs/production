<!-- P31-HEADER
id: p31_v3c_c1_p5_alpha_ranges_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: token-resilience-audit.md D-2-P1
-->

# C1-P5 · Alpha range policy (21 fixed-alpha color tokens)

**Status:** proposal · **Kind:** resilience policy migration (D-2)
**Extracted from:** `design-workflow/V2-D-designv2/token-resilience-audit.md` D-2-P1 (line 112)

## Problem

21 color tokens carry a **fixed** `alpha` (0.03–0.6) on user-controllable
surfaces (glass, neon glow, starfield particles). iOS 27 transparency slider /
M3 tonal surfaces move the backdrop out from under a fixed alpha. The scanner
flags all 21 (negative-control gate: it MUST flag).

## Evidence (file:line)

- `design-workflow/V2-D-designv2/token-resilience-audit.md:41` — color row: 80 tokens, **21** POLICY (fixed alpha)
- `design-workflow/V2-D-designv2/token-resilience-audit.md:112` — proposal D-2-P1
- `design-workflow/V2-D-designv2/token-resilience-audit.md:64-67` — the 21 rule-A findings (glass-*, neon-*, starfield-particle-*, accent-glow)
- `design-workflow/V2-D-designv2/token-resilience-audit.md:81-93` — negative control: fixed-alpha fixture flagged; policy-range fixture clean

## Proposal

Replace fixed `alpha` with a range descriptor resolved at runtime:

```json
{ "$value": { "$type": "color", "components": [...], "alpha": { "min": 0.03, "max": 0.09 } },
  "$extensions": { "p31": { "policy": "range", "resolvedBy": "resolver.flags + user.slider" } } }
```

Resolution picks alpha from backdrop L + transparency-slider position; out-of-range resolution **fails closed** (throws, never guesses).

## Gate

`resilience-scan.mjs` — the 21 policy-shaped rewrites pass clean; a fixed-alpha fixture is still flagged.

**Negative control:** `fixtures/res-neg-fixed-alpha.fixture.json` → flagged (exit 1).

**No canon file was modified by this proposal.**