# fix: postQuantum.ts hybrid KEM is dead, broken, and mislabeled (P-256 claimed as X25519)

<!-- P31-HEADER
id: p31_fix_plan_postquantum_hybrid_kem_broken_20261011_v1.0
type: fix-plan
component: packages/sovereign-primitives
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

The hybrid KEM in `packages/sovereign-primitives/src/postQuantum.ts` is
non-functional and dishonestly labeled:

1. **Broken round-trip.** `hybridEncrypt` (`:291`) generates an ephemeral P-256
   key for ECDH but **never transmits its public key** — `HybridEncrypted`
   (`:40`) has no field for it. `hybridDecrypt` (`:329`) therefore requires a
   `senderPublicKey` argument the encrypt path cannot supply. The two are not a
   usable pair.
2. **False label.** `generateKEMKeyPair` (`:214`) uses `namedCurve: 'P-256'`
   (`:215-217`) but returns `algorithm: 'X25519+ML-KEM-768'` (`:235`).
3. **Dead code.** No module imports `hybridEncrypt`, `hybridDecrypt`, or
   `generateKEMKeyPair` (verified by repo-wide grep). `hybridSign`/`hybridVerify`
   *are* live and must not regress.
4. **Non-standard combiner.** `:317-321,354-358` concatenate the classical and
   KEM secrets and run HKDF with an ad-hoc `info` string — not a named,
   analyzed KEM combiner.

## Evidence

- `packages/sovereign-primitives/src/postQuantum.ts:215-217,235,291,329-361,400`.
- Caller grep: only `packages/sovereign-primitives/src/index.ts:2` re-exports
  them; nothing consumes the KEM functions.
- Live consumers of signing: `packages/canon/src/loom/wimse-dsse.ts:33,121,153`.

## Fix

Ported the KEM to genuine X-Wing (`ml_kem768_x25519` from
`@noble/post-quantum/hybrid.js`):

- `generateKEMKeyPair` now derives an X-Wing keypair (single-seed) — no P-256.
- `hybridEncrypt`/`hybridDecrypt` now use X-Wing `encapsulate`/`decapsulate`;
  the X-Wing ciphertext (1120 bytes) is self-contained, so decrypt needs only the
  recipient's X-Wing secret key — the broken out-of-band `senderPublicKey`
  requirement is gone.
- The composite symmetric key is derived from the X-Wing shared secret via HKDF
  for AES-256-GCM.
- `assessPQCReadiness` now reports X-Wing accurately.

Signing paths (`hybridSign`, `hybridVerify`, SLH-DSA) are unchanged — they were
already correct and are live.

## Impact

- Before: a public export advertised a hybrid KEM that could not round-trip and
  lied about its classical curve.
- After: a working, spec-based X-Wing KEM; label matches implementation.
