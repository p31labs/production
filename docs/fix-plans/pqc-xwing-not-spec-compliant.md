# fix: X-Wing KEM is not spec-compliant (bespoke combiner + wrong draft citation)

<!-- P31-HEADER
id: p31_fix_plan_pqc_xwing_not_spec_compliant_20261011_v1.0
type: fix-plan
component: workers/ledger-bridge
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/ledger-bridge/src/kem.ts` presents itself as X-Wing
(`draft-ietf-lamp-xwing-00`) but is a **bespoke construction** that does not
match the X-Wing spec:

1. **Wrong citation.** The header cites `draft-ietf-lamp-xwing-00` (2026-06-23).
   The actual X-Wing draft is `draft-connolly-cfrg-xwing-kem`.
2. **Non-spec combiner.** `kem.ts:64,81` combine the two shared secrets as
   `SHA-256(mlkem_ss ‖ x25519_ss)`. Spec X-Wing is
   `SHA3-256(ss_M ‖ ss_X ‖ ct_X ‖ pk_X ‖ 0x5c2e2f2f5e5c)` — a transcript-bound
   combiner over the X25519 ephemeral ciphertext and static public key plus a
   domain-separation label. The bespoke version **omits the transcript binding
   and label**, so it is not X-Wing and is not interoperable/analyzed as such.
3. **Split key schedule.** Independent ML-KEM and X25519 keypairs (secret key
   2432 bytes) rather than X-Wing's single-seed derivation (secret key = 32-byte
   seed via `SHAKE128(ikm, 96)`).
4. **Wrong secret-key size** asserts (`XWING_SK_LEN = 2432`), inconsistent with
   the modern draft's 32-byte seed form.

## Evidence

- `workers/ledger-bridge/src/kem.ts:2` — `draft-ietf-lamp-xwing-00`.
- `workers/ledger-bridge/src/kem.ts:64,81` — `sha256(concatBytes(...))`.
- `workers/ledger-bridge/src/kem.ts:30` — `XWING_SK_LEN = MLKEM_SK + X25519_LEN`.
- Defensible source: `draft-connolly-cfrg-xwing-kem` (Connolly, et al.);
  combiner = `SHA3-256(ss_M ‖ ss_X ‖ ct_X ‖ pk_X ‖ label)`, label
  `0x5c2e2f2f5e5c`.

## Fix

Adopted the maintained, KAT-validated library preset **instead of hand-rolling**:
`@noble/post-quantum/hybrid.js` → `ml_kem768_x25519` (aliased `XWing`). This
preset implements the exact X-Wing construction (hard-coded label
`0x5c2e2f2f5e5c`; SHA3-256 transcript over `ct_X ‖ pk_X` plus both secrets;
`SHAKE128` single-seed key derivation). `kem.ts` is now a thin adapter preserving
the existing exported API; `XWING_SK_LEN` corrected to 32 (seed form) and the
citation corrected.

Validated against **all three official X-Wing KAT vectors** from
`draft-connolly-cfrg-xwing-kem` (seed/eseed/ss/sk/pk/ct) — 3/3 pass, including
`keygen(seed)`, `encapsulate(pk, eseed)`, and `decapsulate`. The KAT fixtures and
test live at `workers/ledger-bridge/test/kem.test.ts` and
`workers/ledger-bridge/test/vectors/xwing-kat.json`.

## Impact

- Before: a claim of "X-Wing" was **not** grant-defensible — the code did not
  implement the named standard. An auditor would have found a bespoke,
  transcript-unbound combiner.
- After: the named standard is genuinely implemented and KAT-proven.
