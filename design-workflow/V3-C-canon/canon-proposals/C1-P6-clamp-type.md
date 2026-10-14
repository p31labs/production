<!-- P31-HEADER
id: p31_v3c_c1_p6_clamp_type_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: token-resilience-audit.md D-2-P2
-->

# C1-P6 · `clamp()` type-scale policy (8 fixed-px type tokens)

**Status:** proposal · **Kind:** resilience policy migration (D-2)
**Extracted from:** `design-workflow/V2-D-designv2/token-resilience-audit.md` D-2-P2 (line 113)

## Problem

8 type tokens are fixed px (`h1` 51px → `caption` 7px). Fixed px breaks user
text-size adjustment and the mobile-first `clamp()` rule (WCAG F94, runbook
§2.3). Scanner rule B flags all 8.

## Evidence (file:line)

- `design-workflow/V2-D-designv2/token-resilience-audit.md:42` — dimension row: 26 POLICY (spacing + 8 type-scale)
- `design-workflow/V2-D-designv2/token-resilience-audit.md:69-76` — the 8 rule-B findings (h1…caption)
- `design-workflow/V2-D-designv2/token-resilience-audit.md:113` — proposal D-2-P2

## Proposal

`h1…h4`, `body`, `body-sm`, `label`, `caption` → `clamp(min rem, preferred, max rem)`
per tier, resolved via window-size class + user text-size adjustment.

## Gate

`resilience-scan.mjs` — the 8 rewrites pass clean; a fixed-px type token is still flagged (rule B).

**Negative control:** fixed-px fixture → flagged (exit 1).

**No canon file was modified by this proposal.**