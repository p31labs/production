# fix: ledger-bridge `/kem/xwing/public` exposed the KEM secret key unauthenticated

<!-- P31-HEADER
id: p31_fix_plan_kem_public_secret_exposure_20261011_v1.0
type: fix-plan
component: workers/ledger-bridge
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`GET /kem/xwing/public` (`workers/ledger-bridge/src/index.ts:213`) generated an
X-Wing keypair and returned **both** the public key and the **secret key**
(`secretKey`, base64) in an unauthenticated JSON response. Any caller could mint
a keypair and receive its private half from a public endpoint.

## Evidence

- `workers/ledger-bridge/src/index.ts:213-223` (pre-fix) — `secretKey: bytesToB64(kp.secretKey)`.
- No external caller depends on `/kem/xwing/public`; only the worker's own test.
  (`shell` calls `/kem/xwing/encapsulate`, not `/public`.)

## Fix

The endpoint now returns **public key + size metadata only**. Secret-key
generation is treated as a client/secure-context operation, never served over an
unauthenticated GET. The test was updated to assert `j.secretKey` is undefined
and to cover the encapsulate/decapsulate unit path locally instead.

## Impact

- Before: an auditor would flag a public endpoint leaking private key material —
  disqualifying for a grant whose thesis is cryptographic rigor.
- After: the endpoint exposes only what its name promises (the public key).
