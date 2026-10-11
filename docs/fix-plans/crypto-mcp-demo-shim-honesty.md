# fix: p31-crypto-mcp advertised real PQC while returning synthetic values

<!-- P31-HEADER
id: p31_fix_plan_crypto_mcp_shim_20261011_v1.0
type: fix-plan
component: workers/p31-crypto-mcp
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/p31-crypto-mcp/src/index.ts` presented itself as a working
post-quantum cryptography service. `pqc_verify` always returned
`{ valid: true }`, `pqc_audit` reported `status: 'pass'` with `✅ FIPS 203/204`
component rows, and the MCP server-card advertised "ML-DSA-65 keygen/sign/verify,
ML-KEM-768, SLH-DSA-128s, hybrid signatures". In reality `executeTool` returned
hardcoded/random-hex placeholders and performed no cryptography. This is a
false compliance claim that cannot survive grant review (OTF, NLnet, NIST).

## Evidence

`workers/p31-crypto-mcp/src/index.ts` — `executeTool()` returned
`valid: true` from `pqc_verify` with no verification; `pqc_audit` emitted
`✅ FIPS 204` / `✅ FIPS 203` statuses; the `/.well-known/mcp/server-card.json`
description named the algorithms as if implemented here.

The real, tested primitives live elsewhere and are unaffected:
`packages/sovereign-primitives/src/postQuantum.ts`,
`packages/sovereign-primitives/src/composite.ts`,
`workers/ledger-bridge/src/sdjwt.ts`,
`workers/federation-bridge/src/index.ts`.

## Fix

Relabelled the worker as an explicit **DEMO SHIM / interface scaffold**:
header comment and server-card now state it performs no cryptography and is not
FIPS-attested. `executeTool` tags every response `{ demoShim: true, attested:
false }`; `pqc_verify` returns `valid: null` ("not evaluated"); `pqc_audit`
returns `status: 'not-attested'` and points each component at where it is
really implemented. Added `TODO(crypto-mcp)` naming the wiring work, tracked
here. No cryptographic or public API shape beyond the honesty markers changed.

## Resolution

Applied 2026-10-11. `pqc_verify` no longer asserts success and no surface
claims FIPS attestation. Follow-up (wire the tools to
`ledger-bridge`/`federation-bridge`) is named in the worker TODO but is out of
scope for the honesty pass.
