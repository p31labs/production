# V2.0 — Pending Human Sign-Off (RB-SPINE-001 decision surface)

<!-- P31-HEADER
id: p31_v2_signoff_20261011_v1.0
type: decision-record
component: design-workflow
status: open — awaiting explicit human override
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

Three portal-facing deliverables from runbook v2.0 are complete but frozen by
RB-SPINE-001 ("the portal is the reference; it does not adopt; any modification
requires an explicit human override with a documented reason"). Each item below
has its full proposal file and the exact change. Sign each A/B/C.

## A. Apply the llms.txt tier-contract additions — ✅ APPLIED (2026-10-11, explicit override)

- **Proposal:** `production/design-workflow/V2-B-laneE/llms-proposal.md`
- **Change:** `## Device tiers` inserted in `public/llms.txt` (between Foundations
  and Components, now line 11) + `## Device tiers (manifest contract)` in
  `public/llms-full.txt` (after Rules, now line 68). Sources updated; `dist/`
  regenerates at next portal build (node_modules currently absent — recorded).
- **Override:** WILL, 2026-10-11 — "Apply (Recommended)".

## B. Pick the canonical MCP surface and deploy tier tools — ✅ ACCEPTED (2026-10-11)

- **Proposal:** `production/design-workflow/V2-B-laneE/mcp-resolution.md`
- **Decision:** canonical = design-core `src/mcp/` http-worker; reconcile
  17-vs-13 registry/dispatcher drift before deploy; add `resolve_device_tier` +
  `get_tier_tokens` (thin JSON-RPC adapters over `B-device-tiers/device-tiers.mjs`,
  fail-closed); retire legacy 35-tool worker; repoint console endpoint.
  **Deploy happens in a separate session** (worker deploy outside lane boundaries).
- **Override:** WILL, 2026-10-11 — "Accept recommendation".

## C. Wire the CI gate into the portal `pnpm gate` chain — ✅ APPLIED (2026-10-11)

- **Proposal:** `V2-C-ci/wire-proposal.md`. Patch applied to
  `production/portals/design/package.json` (`gate` script): ci-gate.mjs runs after
  `pnpm build:pwa &&`, before `canon-source-audit`; JSON re-validated.
  Activates on the next portal build session (node_modules currently absent).
- **Override:** WILL, 2026-10-11 — "Apply (Recommended)".

---

## Decisions this record finalizes (from executed lanes, no action needed)

1. Portal visuals: untouched (freeze honored).
2. Canon (`packages/canon`, `design-core`): untouched (mistake #10 honored) —
   all v2 architecture is contribution-proposal format.
3. Firmware: untouched — Lane A queued behind fix-plan
   `production/docs/fix-plans/nodezero-embedded-ui-gap.md` (hardware-gated).
4. DESIGN.md doctrine: appended 2026-10-11 (`DESIGN.md:322`) — not frozen
   (outside the portal).

## Status update

| Lane | State |
|---|---|
| B (docs/matrix) | ✅ complete, verified |
| C (CI enforcement) | 🔄 in flight |
| D (design v2) | 🔄 in flight (relaunched after transient rate-limit) |
| A (firmware) | ⏸ queued — hardware-gated |