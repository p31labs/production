<!-- P31-HEADER
id: p31_v5a_a3_governance_decision_20261011_v1.0
type: rehearsal-decision
component: design-workflow/V5-A-canon-sandbox
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-a-v5
-->

# A-3 Governance delta — placement decision (RFC-0006 versionPolicy)

## Decision: BRAND-LEVEL field (not `$extensions.p31.versionPolicy`)

`versionPolicy` is a **brand-level field** — a sibling of `name` / `$extends` /
`tokens` in the future brand file, exactly as rehearsed in
`multi-brand-schema.md:64`:

```json
{ "name": "garden", "$extends": ["../../Base/tokens.json"], "versionPolicy": "minor", "tokens": { … } }
```

**Evidence for the placement:**

1. `multi-brand-schema.md:64` (C1-P3 source) — the rehearsed RFC-0006 shape puts
   `versionPolicy` at brand-file level.
2. `V3-C-canon/validates-v3.mjs:157-165,287-288` — rule R6 reads
   `b.versionPolicy` at the brand level in fixture mode. `$extensions.p31.*` is
   NOT inspected for R6; a `$extensions.p31.versionPolicy` placement would be
   invisible to the gate → the gate would flag every brand. Placement is chosen
   so the rehearsed gate actually enforces it.
3. `V3-C-canon/fixtures/pos-parent-child.fixture.json` — the existing positive
   control carries `"versionPolicy"` as a brand-level field.

**Value:** every brand = `"minor"` (RFC-0006 operator-runbook starting value,
per the v5.0 runbook). **Base** = `"exact"` (decision: a silently-moving Base
would break every child's semver contract; Base is pinned and moves only by
explicit operator action). Base is not a theme pack in today's flat canon, so
its versionPolicy is rehearsed in `brands-rehearsal/Base/tokens.json`.

## Where it landed in the sandbox (rehearsal only)

- `tokens/tokens.dtc.json` — `themes.<name>.versionPolicy = "minor"` for all 11
  packs (in today's flat file the theme pack IS the brand; the field is a
  sibling of `p31`, mirroring the future brand-file placement).
- `brands-rehearsal/Base/tokens.json` + `brands-rehearsal/brands/<name>/tokens.json`
  — C1-P4 shape rehearsal: `name` + `$extends: ["../../Base/tokens.json"]` +
  `versionPolicy` + `tokens` (override names). The canon file was NOT renamed;
  this tree is a manifest of the future shape.
- `A3-brands-shape-manifest.json` — machine-readable shape manifest (name
  lists, extends targets, policies).

## Why NOT `$extensions.p31.versionPolicy`

`$extensions.p31` is the per-token extension namespace (themes mirror, policy
descriptors). Version policy governs the BRAND PACK (a set of tokens), not a
single token — token-level placement would be a category error and would
silently dodge R6. Rejected.