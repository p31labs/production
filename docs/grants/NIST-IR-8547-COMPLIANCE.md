<!-- P31-HEADER
id: p31_grant_nist_ir_8547_alignment_20260713_v2.0
type: research
component: docs
status: live
retention: keep-forever
created: 2026-07-13T00:00:00Z
owner: will
-->

# NIST IR 8547 Alignment Report — P31 Post-Quantum Cryptography

**Report Date:** 2026-10-11 (rev 2.0)
**CWP:** CWP-2026-029 (Full-Stack Post-Quantum Transformation)
**Status:** Primitives implemented and KAT-verified; **not a certification**. See §7.

> **Honesty note (rev 2.0, 2026-10-11).** Earlier revisions of this document
> claimed the stack was "NIST IR 8547 compliant — no deprecated algorithms
> remain in active paths." That claim was **false**: a legacy worker
> (`care-api`) still carried ECDSA P-256 and a fail-open verifier, and the KEM
> was a bespoke construction mislabeled as X-Wing. Those defects are fixed or
> tracked (see §5). This revision states what the code actually does. NIST IR
> 8547 is a *migration-guidance* report, not a certification program, and P31
> holds no CMVP/FIPS certificate.

---

## 1. Executive summary

P31 Labs implements NIST-standardized post-quantum primitives —
ML-KEM-768 (FIPS 203), ML-DSA-65 (FIPS 204), SLH-DSA-128s (FIPS 205) — and the
hybrid **X-Wing** KEM (`draft-connolly-cfrg-xwing-kem`), all via
`@noble/post-quantum` (pure JS). Signatures use composite
Ed25519 + ML-DSA-65 defence-in-depth that **fails closed**.

**What is claimed:**
- All asymmetric signatures on new credentials use ML-DSA-65 as primary.
- X-Wing (X25519 + ML-KEM-768) is the KEM, KAT-validated against all three
  official vectors.
- **No RSA** in any path.

**What is not claimed:**
- No FIPS 140-3 / CMVP certificate.
- No external audit yet (this is the funded deliverable).
- Deprecated ECDSA P-256 exists in exactly one legacy worker, `care-api`,
  whose verifier now fails closed pending real wiring (§5).

---

## 2. NIST IR 8547 Algorithm Status

| Algorithm | NIST IR 8547 stance | P31 status | Evidence |
|-----------|---------------------|------------|----------|
| ML-DSA-65 (FIPS 204) | Approved | ✅ Primary signature | `packages/sovereign-primitives/src/composite.ts:102,115`; `workers/ledger-bridge/src/sdjwt.ts:262` |
| ML-KEM-768 (FIPS 203) | Approved | ✅ Via X-Wing | `workers/ledger-bridge/src/kem.ts:46,51,59` (ek 1184 B, ct 1088 B, dk 2400 B) |
| SLH-DSA-128s (FIPS 205) | Approved | ✅ Available (PQC vault) | `postQuantum.ts:178,185,194` |
| X25519 | Not on deprecation list | ✅ Via X-Wing | `draft-connolly-cfrg-xwing-kem` |
| Ed25519 | Retire 2030 (guidance) | ⚠️ Retained (hybrid/compat) | `packages/canon/src/loom/wimse-dsse.ts:33` |
| RSA-2048 | Disallowed 2030 | ❌ Not used | No RSA in codebase |
| ECDSA P-256 | Disallowed 2030 | ⚠️ **One legacy worker** | `workers/care-api/src/lib/pqc.ts:7` — verifier fails closed; remediation tracked (`docs/fix-plans/care-api-pqc-fail-open.md`) |
| ECDH P-256 | Disallowed 2030 | ❌ Not used (removed 2026-10-11) | Formerly in `postQuantum.ts`; replaced by X-Wing |

---

## 3. Cryptographic primitives used (with size assertions)

### 3.1 Signatures
- **ML-DSA-65** (`@noble/post-quantum` v0.6.1): pk 1952 B, sk 4032 B, sig 3309 B
  — asserted in `capabilityToken.test.ts:31-32,40`.
- **Ed25519** (WebCrypto): legacy/compat + composite component.
- **Composite** (`compositeSign`/`compositeVerify`): Ed25519 + ML-DSA-65, fails
  closed (`composite.ts:102,115`).

### 3.2 Key encapsulation
- **X-Wing** (`ml_kem768_x25519`): pk 1216 B, ct 1120 B, ss 32 B, sk 32 B (seed
  form). Validated against the official KAT vectors — see
  `workers/ledger-bridge/test/kem.test.ts` and
  `workers/ledger-bridge/test/vectors/xwing-kat.json`.

### 3.3 Hashing / symmetric
- **SHA-256** (`@noble/hashes`): SD-JWT disclosure hashing.
- **SHA3-256**: X-Wing combiner (inside the noble preset).
- **AES-256-GCM** over an HKDF-derived key: `postQuantum.ts:49,73,318`.

### 3.4 Selective disclosure
- **SD-JWT** (RFC 9901 + `draft-ietf-oauth-sd-jwt-vc`): issue/verify.

---

## 4. Standards alignment matrix

| Standard | Version | P31 implementation | Status |
|----------|---------|---------------------|--------|
| W3C DID Core | v1.1 | `did:key`, `did:jwk`, `did:web` | ✅ Implemented |
| RFC 9964 | 2025-11 | AKP JWK (`kty:AKP`, `alg:ML-DSA-65`) | ✅ Implemented |
| RFC 9901 | SD-JWT v2 | `iss`/`aud`/`iat`, Ed25519 + ML-DSA-65 | ✅ Implemented |
| `draft-ietf-oauth-sd-jwt-vc` | draft-17 | `typ:dc+sd-jwt`, KB-JWT | ✅ Implemented |
| FIPS 203/204/205 | 2024-08 | ML-KEM-768 / ML-DSA-65 / SLH-DSA-128s | ✅ Implemented |
| `draft-connolly-cfrg-xwing-kem` | draft | X-Wing KEM | ✅ Implemented + KAT |
| NIST IR 8547 | 2025 | Migration-guidance alignment | 🟡 Partial (§2, §5) |
| WCAG 2.2 | AAA target | UI keyboard-navigable, crisis mode | 🟡 Partial |

---

## 5. Known gaps and remediation (do not omit)

| Gap | Where | Tracking |
|-----|-------|----------|
| ECDSA P-256 legacy + fail-open verifier | `workers/care-api/src/lib/pqc.ts:7,26` | `docs/fix-plans/care-api-pqc-fail-open.md` (fail-closed applied; real ML-DSA-65 pending) |
| MCP tools are a demo shim | `workers/p31-crypto-mcp/src/index.ts` | `docs/fix-plans/crypto-mcp-demo-shim-honesty.md` |
| Bespoke KEM mislabeled X-Wing | `ledger-bridge/src/kem.ts` | **Fixed 2026-10-11** — `docs/fix-plans/pqc-xwing-not-spec-compliant.md` |
| Mislabeled P-256 KEM leg | `postQuantum.ts` | **Fixed 2026-10-11** — `docs/fix-plans/postquantum-hybrid-kem-broken.md` |
| No external audit / no FIPS certificate | — | This is the funded ask (`docs/grants/PQC-AUDIT-SCOPE.md`) |

---

## 6. Test evidence (as run 2026-10-11)

| Suite | Command | Result |
|-------|---------|--------|
| `ledger-bridge/test/kem.test.ts` (incl. X-Wing KAT) | `npx vitest run test/kem.test.ts` | ✅ 10/10 |
| `ledger-bridge/test/sdjwt.test.mjs` + `mldsa65-verify.test.mjs` | `node --test test/*.mjs` | ✅ 23/23 |
| `sovereign-primitives` (all suites, incl. new `postQuantum.test.ts`) | `npx vitest run` | ✅ 95/95 |

> Note: `vitest run` in `ledger-bridge` does not collect the `node:test` `.mjs`
> files (pre-existing config gap, tracked separately); run them with
> `node --test`.

---

## 7. Certification status — plain statement

P31 does **not** hold a FIPS 140-3 / CMVP certificate, has **not** undergone
ACVP testing, and has **not** been independently audited. P31 uses
NIST-standardized algorithms implemented in a non-validated library
(`@noble/post-quantum`). Do not describe this as "FIPS-certified" or "NIST
IR 8547 compliant" — describe it as **aligned with** the standards and
**pending audit**.

---

## 8. Recommendations

1. **Wire care-api** to real ML-DSA-65 + X-Wing, then remove the P-256 path.
2. **Independent audit** of the PQC surface (funded deliverable).
3. **ACVP scoping** for the noble-based primitives.
4. **Ed25519 sunset** plan aligned to the 2030 IR 8547 guidance.

---

## 9. References

- [NIST IR 8547](https://csrc.nist.gov/publications/detail/ir/8547/final)
- [FIPS 203 (ML-KEM)](https://csrc.nist.gov/publications/detail/fips/203/final) · [FIPS 204 (ML-DSA)](https://csrc.nist.gov/publications/detail/fips/204/final) · [FIPS 205 (SLH-DSA)](https://csrc.nist.gov/publications/detail/fips/205/final)
- [draft-connolly-cfrg-xwing-kem](https://datatracker.ietf.org/doc/draft-connolly-cfrg-xwing-kem/)
- [RFC 9964 (AKP JWK)](https://datatracker.ietf.org/doc/rfc9964/) · [RFC 9901 (SD-JWT)](https://datatracker.ietf.org/doc/rfc9901/)
- [Executive Order 14412 (2026-06-22)](https://www.whitehouse.gov/) · OMB M-26-15 (2026-06-24)
