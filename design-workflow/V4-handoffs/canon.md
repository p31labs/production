# Handoff Packet 3 — Canon adoption (design-core)

<!-- P31-HEADER
id: p31_v4_handoff_canon_20261011_v1.0
type: handoff-packet
component: design-workflow/V4-handoffs
status: ready — external design-core session required
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

**Session prerequisite:** design-core maintainer (mistake #10: canon changes are
adoptions, never in-place workarounds). All patches pre-verified on temp copies.

**Inputs (hashes in `V4-D-design-ci/V4-handoff-manifest.json`):**
- `design-workflow/V3-C-canon/canon-proposals/` — 11 PR-ready proposals (P1–P9 + F1/F2) with file:line evidence
- `design-workflow/V3-C-canon/canon-diff/C3-F1-sunlight-text.patch.json` (remove duplicated token, zero information loss)
- `design-workflow/V3-C-canon/canon-diff/C3-F2-extensions-themes-equals-11.patch.json` (25 derived adds, zero value changes)
- Validator: `design-workflow/V3-C-canon/validates-v3.mjs` (R1–R6 incl. depth limit + versionPolicy)

**Steps:**
1. **C-1** Apply F1 + F2 patches to `packages/canon/tokens/tokens.dtc.json`.
2. **C-2** Adopt `versionPolicy: "minor"` on all 11 brands (RFC-0006 operator
   runbook: `minor` blocks breaking syncs by default — closes finding F3).
3. **C-3** Adopt `brands/<name>/tokens.json` + `$extends` shape (proven 243/243,
   zero value changes).
4. **C-4** Land P5–P9 resilience policy descriptors (76 descriptors, all valid;
   migration 70→0 on temp copy).

**Gates (in the design-core session, behind the named CI gate):**
- patched canon passes `token-audit.mjs` → NEG: raw-hex patch → fail
- `validates-v3.mjs` exits 0 (every brand versionPolicy'd, no depth-2 chains) → NEG: missing versionPolicy → fail

**Follow-ups filed:** F2.1 (ocean glass alpha asymmetry in the top-level group),
F3 (versionPolicy — closed by C-2).

**Report back in the runbook status format.**
---

## Verified status — v5.0 Lane A rehearsal (2026-10-11, on-box)

The full adoption was rehearsed in `design-workflow/V5-A-canon-sandbox/`
(real canon untouched, sha256 `2ed16e75…` verified). Receipts:
`V5-A-canon-sandbox/REHEARSAL-REPORT.md` (gates A-1..A-5 all green; three
negative controls fail as designed; replay from a pristine copy produced a
file **byte-identical** to the rehearsed state, `a07f6702…`).

The REAL merge is now a numbered 6-step operator action list (§A-6 of the
report): baseline+backup → apply F1/F2 via `apply-patches.mjs` → apply
governance+policy deltas via `V5-A-canon-sandbox/operator-apply-deltas.mjs`
(replay-proven, 11/11 versionPolicy, 70/70 rewrites, 76/76 descriptors) →
mirror sync (conditional, Finding A1-1) → re-run the close-the-loop gates
against real canon → `V4-run-all-gates.mjs` exit 0.

Findings filed (non-blocking): A1-1 (no tokens.json mirror exists in
packages/canon on disk today), A6-1 (`validates-v3.mjs:234` hardcodes the
R6 check — close-the-loop must use fixture mode, proven in rehearsal).
