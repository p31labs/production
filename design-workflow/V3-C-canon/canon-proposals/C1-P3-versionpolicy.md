<!-- P31-HEADER
id: p31_v3c_c1_p3_versionpolicy_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: multi-brand-schema.md D-1-P3
-->

# C1-P3 · Enforce explicit `versionPolicy` per theme pack

**Status:** proposal · **Kind:** canon adoption (RFC-0006 token semver)
**Extracted from:** `design-workflow/V2-D-designv2/multi-brand-schema.md` D-1-P3 (line 182)

## Problem

RFC-0006 requires an explicit `versionPolicy` on every brand — `exact` /
`minor` / `minor-and-major` / `latest` — **no implicit default**. The schema
already proposes `"versionPolicy": "minor"` on the sample brand
(`multi-brand-schema.md:64`), but no theme pack in canon declares one. This is
an **adoption gap**, not a design gap (runbook §1: versionPolicy).

## Evidence (file:line)

- `design-workflow/V2-D-designv2/multi-brand-schema.md:64` — `"versionPolicy": "minor"` in the RFC-0006 sample
- `design-workflow/V2-D-designv2/multi-brand-schema.md:182` — proposal D-1-P3
- Lane C audit 2026-10-11 (validates-v3.mjs, canon run): **0 of 11 brands** carry `versionPolicy` → finding **F3**.

## Proposal

1. Every brand (and Base) declares `versionPolicy` ∈ {exact, minor, minor-and-major, latest}.
2. Validator rejects any brand without it (rule R6, `validates-v3.mjs`) — fail closed, never a guess.

## Gate

`node design-workflow/V3-C-canon/validates-v3.mjs` — canon run reports brand count with
`versionPolicy`; a versionPolicy-less brand → R6 FAIL.

**Negative control:** `fixtures/neg-no-versionpolicy.fixture.json` (child without `versionPolicy`) → FAIL.

## Files touched (adoption time)

- brand files under the future `brands/<name>/tokens.json` layout — each gains `"versionPolicy"`.

**No canon file was modified by this proposal.**