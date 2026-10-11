# fix: PQC docs make unverified compliance claims ("no deprecated algorithms", "NIST IR 8547 compliant")

<!-- P31-HEADER
id: p31_fix_plan_pqc_false_compliance_claims_20261011_v1.0
type: fix-plan
component: docs
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

Several grant/compliance documents assert post-quantum compliance that the
codebase does not, and cannot yet, substantiate. An external auditor or funder
verifying these statements would find them false — a direct violation of the
harness's core honesty law (no false compliance claims).

Concrete instances:

1. `docs/grants/NIST-IR-8547-COMPLIANCE.md:17,31,32,56` and
   `docs/grants/NGI-TALER-FORM-FINAL.md:51,122,192,245` — claims of "no
   deprecated algorithms" / NIST IR 8547 compliance. The repo still runs a
   P-256 ECDH path (`workers/care-api/src/lib/pqc.ts:7`), and the KEM was a
   bespoke non-standard construction (see
   `docs/fix-plans/pqc-xwing-not-spec-compliant.md`) — neither is IR 8547
   "compliant".
2. `docs/CRYPTOGRAPHIC-INVENTORY.md:19,29,92` — repeats the same compliance
   framing and states an incorrect X-Wing secret-key size.
3. `packages/sovereign-primitives/src/postQuantum.ts:20,235` — labels the KEM
   algorithm `'X25519+ML-KEM-768'` while the implementation used **P-256**
   ECDH. A false algorithm label.

## Evidence

- `docs/grants/NIST-IR-8547-COMPLIANCE.md` lines 17, 31, 32, 56.
- `docs/grants/NGI-TALER-FORM-FINAL.md` lines 51, 122, 192, 245.
- `docs/CRYPTOGRAPHIC-INVENTORY.md` lines 19, 29, 92.
- `packages/sovereign-primitives/src/postQuantum.ts:215-217,235`.
- `workers/care-api/src/lib/pqc.ts:7` — live P-256 ECDSA legacy path.

## Fix

- Rewrote the compliance documents to state **what is implemented and proven**
  (ML-KEM-768 / ML-DSA-65 / SLH-DSA-128s / X-Wing, with KAT evidence) and to
  describe **migration status** against EO 14412 (2026-06-22) and OMB M-26-15
  rather than claim present-tense compliance. The audit is the funded ask.
- Corrected the `postQuantum.ts` algorithm label by genuinely porting the KEM to
  X-Wing/X25519 (see `docs/fix-plans/postquantum-hybrid-kem-broken.md`).
- Corrected the cryptographic inventory to pin resolved dependency versions and
  accurate key sizes.

## Impact

- Before: funder-facing claims could be falsified by a five-minute code read —
  catastrophic for a grant whose thesis is honest PQC engineering.
- After: every claim traces to `file:line` or a KAT fixture.
