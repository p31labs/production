# fix: care-api verifyHybridSignature fails OPEN; ML-KEM is a random-byte stub

<!-- P31-HEADER
id: p31_fix_plan_care_api_pqc_fail_open_20261011_v1.0
type: fix-plan
component: workers/care-api
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/care-api/src/lib/pqc.ts` is a placeholder presented as a working hybrid
PQC layer. Three defects, one of them an authentication bypass:

1. **Fail-open verifier (critical).** `verifyHybridSignature` (`:26-32`)
   unconditionally `return true`. It is wired into the care-proof auth path at
   `workers/care-api/src/index.ts:87-96`: whenever a request carries
   `mlDsaPublicKey`/`mlDsaSignature`/`payload`, the "PQC signature verification"
   passes regardless of the bytes. Any client can satisfy it.
2. **Fake ML-KEM.** `hybridKeygen` (`:11-13`) returns `crypto.getRandomValues`
   placeholders for the "ML-KEM" public/secret keys, and `hybridDecapsulate`
   (`:23`) returns a random 32-byte value. No ML-KEM is performed.
3. **Deprecated classical algorithm.** `hybridKeygen` (`:7`) uses ECDSA **P-256**
   — exactly the deprecated algorithm the PQC docs claim has been eliminated.

## Evidence

- `workers/care-api/src/lib/pqc.ts:7,11-13,23,26-32`.
- `workers/care-api/src/index.ts:87` — fail-open verifier in the request path.
- `workers/care-api/src/index.ts:307-317` — a "session" is built from the
  random-byte stub and stored in KV `PQC_SESSION`.
- `workers/care-api/wrangler.toml:1` — worker `name = "care-api"`, D1
  `love-ledger` (live).
- `workers/care-api/package.json` — no cryptographic dependencies; the stub
  cannot be resolved to a real implementation as-is.

## Fix (interim, applied)

`verifyHybridSignature` now **fails closed** — it throws instead of returning
true, so the caller's try/catch (`index.ts:97`) returns 401 and logs. This
closes the bypass immediately. The function is otherwise unchanged.

## Fix (required, open)

- Add `@noble/post-quantum` as a dependency and implement real ML-DSA-65
  verification (public key 1952 B, signature 3309 B) mirroring the verified
  pattern in `workers/ledger-bridge` and `packages/sovereign-primitives`.
- Replace the ML-KEM stub with real key establishment. Preferred: reuse the
  canonical X-Wing preset `ml_kem768_x25519` (`@noble/post-quantum/hybrid.js`)
  so care-api shares one audited KEM with `ledger-bridge`.
- Drop the ECDSA P-256 classical leg.

## Impact

- Until the interim fix, care-api's PQC branch was an **open door**: signature
  verification was a no-op returning success. This also falsified the
  "no deprecated algorithms" and "PQC fully implemented" claims in the grant
  documents.
- The interim fail-closed change trades availability of a non-functional check
  for correctness; the required fix restores real verification.
