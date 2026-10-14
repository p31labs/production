<!-- P31-HEADER
id: p31_fix_plan_cbs_hkdf_conformance_20261011_v1.0
type: fix-plan
component: crypto
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# fix-plan: CBS derivation uses domain-separated SHA-512, not the Taler HKDF construction

## Symptom

The two-challenge Clause Blind Schnorr implementation landed 2026-10-11
(`workers/creation-accountant/taler-cbs/src/lib.rs` + love-ledger kdf) derives:

- issuer nonces: `n_i = clamp(SHA-512("cbs-n{i}" ‖ x ‖ t))`
- client blinding factors: `SHA-512("cbs-a{i}" ‖ bseed)`

The GNU Taler thesis construction derives these via **HKDF**:

- `b_s := HKDF(256, c'_s ‖ R_0 ‖ R_1, "b-seed")`
- `α₀ := HKDF(256, b_s, "a0")`, `α₁ := HKDF(256, b_s, "a1")`,
  `β₀ := HKDF(256, b_s, "b0")`, `β₁ := HKDF(256, b_s, "b1")`
- nonces derived from the denomination master seed via HKDF with the
  per-withdrawal nonce `t`.

## Assessment

Both are domain-separated PRF constructions over the same primitives; the
SHA-512 variant is cryptographically reasonable and the scheme's security
(one-more-unforgeability vs the modified ROS problem, nonce-uniqueness
preventing key recovery) does not depend on HKDF specifically. The deviation
is a **conformance** gap, not a security break: an auditor expecting the Taler
withdrawal derivation will see a different KDF surface.

## Fix

Before the scheduled audit (Restack prep, 3 Nov):

1. Migrate `kdf` to the Taler HKDF construction: `b_s = HKDF-256(c'_s ‖ R_0 ‖
   R_1, "b-seed")` → α/β with labels "a0"/"a1"/"b0"/"b1"; issuer nonces via
   HKDF from the master seed keyed by `t` (keep domain separation labels).
2. Keep the ABI stable (route shapes, wire formats, test vectors updated to
   the new derivation) — no protocol change.
3. Note the migration in `docs/specs/love-settlement-cbs.md` §Implementation.

## Until then

`docs/specs/love-settlement-cbs.md` carries an explicit "Derivation deviation
(pre-audit)" note (added 2026-10-11) so no reviewer is surprised.