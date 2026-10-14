<!-- P31-HEADER
id: p31_v3c_c1_p2_collapse_dual_source_themes_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: multi-brand-schema.md D-1-P2
-->

# C1-P2 · Collapse the dual-source themes surface

**Status:** proposal · **Kind:** canon adoption (ONE SOURCE law)
**Extracted from:** `design-workflow/V2-D-designv2/multi-brand-schema.md` D-1-P2 (line 181)

## Problem

Theme data exists **twice** in canon (evidence: `multi-brand-schema.md:21-27`):

| Surface | Shape | Coverage |
|---|---|---|
| `themes.*` top-level group | 11 packs × flat `p31.*` maps | aurora, cipher, family, garden, mono, ocean, retro, sunlight, sunset, volt, zen |
| per-token `$extensions.p31.themes` | inline override map on 24 p31/color tokens | 10 packs — **ocean missing** (and `accent.green.muted` is missing **aurora** too) |

Two sources for one fact is drift risk (runbook Law 1: ONE SOURCE).

## Evidence (file:line)

- `packages/canon/tokens/tokens.dtc.json:1151` — first per-token `$extensions.p31.themes` map
- `packages/canon/tokens/tokens.dtc.json:4760` — `themes.ocean.p31` (exists only top-level)
- `design-workflow/V2-D-designv2/multi-brand-schema.md:41-44` — finding F2
- `design-workflow/V2-D-designv2/multi-brand-schema.md:181` — proposal D-1-P2
- Lane C audit 2026-10-11: 24 tokens carry `$extensions.p31.themes`; 23 list 10 packs (missing ocean), 1 (`/p31/color/accent/green/muted`) lists 9 (missing aurora + ocean). The extension values are *derived* (alpha 0.8 blends, chroma-0.05 mutes) and **do not equal** the top-level pack values for 10 of 24 tokens — the two sources hold different facts.

## Proposal

1. Keep the top-level `themes` group as the single source (11 packs).
2. Retire the per-token `$extensions.p31.themes` maps — or, minimally, make one
   surface a **generated mirror** of the other (CI gate asserts 11 == 11 on
   every canon change).

## Gate

Extension surface ⊆ top-level surface; every pack present in both; CI parity
check `V2-C-ci/cross-target-parity.mjs` style.

**Negative control:** a canon change that touches themes in only one surface → parity gate fails.

## Files touched (adoption time)

- `packages/canon/tokens/tokens.dtc.json` — remove the 24 `$extensions.p31.themes` maps (patch `C3-F2`)

**No canon file was modified by this proposal.**