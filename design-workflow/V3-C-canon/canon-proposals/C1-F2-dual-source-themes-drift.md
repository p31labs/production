<!-- P31-HEADER
id: p31_v3c_c1_f2_dual_source_themes_20261011_v1.0
type: contribution-proposal
component: canon
status: proposal
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-c-canon
source: multi-brand-schema.md finding F2
-->

# C1-F2 · Canon drift: dual-source theme overrides — `$extensions.p31.themes` ≠ top-level `themes`

**Status:** proposal · **Kind:** canon-drift finding → contribution proposal
**Extracted from:** `design-workflow/V2-D-designv2/multi-brand-schema.md` finding F2 (lines 41-44)

## Finding

Per-token `$extensions.p31.themes` maps list **10 packs** (missing `ocean`,
which exists only in the top-level group at line 4760). Verified 2026-10-11:
24 p31/color tokens carry the map — 23 list 10 packs, and
`/p31/color/accent/green/muted` lists **9** (missing `aurora` **and** `ocean`).
Two sources for one fact = drift risk (runbook Law 1: ONE SOURCE).

Additionally, the two surfaces hold **different facts**: for 10 of 24 tokens the
extension values are *derived* (alpha-0.8 blends on `action.primary-hover`,
chroma-0.05 mutes on the `*-muted` tokens) and do not equal any top-level pack
value. Rule verified **uniform across all present packs** (2026-10-11) — so
ocean entries CAN be completed exactly for all 24 tokens (see patch `C3-F2`).

## Evidence (file:line)

- `packages/canon/tokens/tokens.dtc.json:1151` — per-token `$extensions.p31.themes` (24 occurrences)
- `packages/canon/tokens/tokens.dtc.json:4760` — `themes.ocean.p31` (top-level only)
- `design-workflow/V2-D-designv2/multi-brand-schema.md:41-44` — F2
- `design-workflow/V2-D-designv2/multi-brand-schema.md:181` — D-1-P2 (resolution)

## Proposal (resolution)

1. **Short-term (patch `C3-F2`):** complete the extension mirror — add `ocean`
   to all 24 maps (and `aurora` to `accent.green.muted`) so every list = 11,
   derived exactly from the top-level `themes.ocean.p31` / `themes.aurora.p31`
   values under the verified uniform rules. Stops the drift at zero value change.
2. **Long-term (D-1-P2):** keep ONE themes surface (top-level group); retire the
   per-token maps or make one a generated mirror of the other behind a CI
   parity gate.

## Gate

Patch `C3-F2` applies clean to a canon copy; token-audit passes; every
`$extensions.p31.themes` list == 11.

**Negative control:** a patch that fabricates an ocean value (not derived from
the top-level ocean pack) → mismatch, and the patch must be rejected by review.

**No canon file was modified by this proposal.**