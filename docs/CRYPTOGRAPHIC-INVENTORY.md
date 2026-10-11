# Cryptographic Inventory — P31 Labs

**Document Date:** 2026-07-14 · **Updated:** 2026-10-11 (X-Wing KAT evidence, §2)
**CWP:** CWP-2026-044 (Interoperability Frontier), Phase 2
**Standard:** NIST Internal Report (IR) 8547 — Recommendations for Discontinued Use of Specific Algorithms and Key Lengths
**Companion docs:** `docs/grants/NIST-IR-8547-COMPLIANCE.md`, `docs/STANDARDS-MONITORING.md`

---

## 1. Executive Summary

This inventory enumerates every cryptographic asset in the P31 production stack — key types,
algorithms, key sizes, certificates, and migration status — per the NIST IR 8547 asset-inventory
requirement. The stack is **post-quantum-first**: asymmetric signing uses NIST FIPS 204
(ML-DSA-65) as the primary scheme, with Ed25519 retained as a hybrid/backward-compat layer.
Key establishment uses the **X-Wing** hybrid KEM (X25519 + ML-KEM-768,
`draft-connolly-cfrg-xwing-kem`), KAT-validated in `workers/ledger-bridge`.

**Deprecated-algorithm exception (must not be omitted):** one legacy worker,
`workers/care-api/src/lib/pqc.ts:7`, still contains an ECDSA P-256 stub; its
signature verifier previously failed **open** and now fails closed pending real
ML-DSA-65 wiring (`docs/fix-plans/care-api-pqc-fail-open.md`). No RSA is present
anywhere. See `docs/grants/NIST-IR-8547-COMPLIANCE.md` for the full status.

---

## 2. Cryptographic Asset Inventory

| # | Asset | Algorithm | Key Size | Location | Status | Migration Plan |
|---|--------|-----------|-----------|----------|--------|----------------|
| 1 | Sovereign DID `did:key` | Ed25519 | 32 B public | PHOS PQC Keys, `did:key` resolution | Active (hybrid) | Pair with ML-DSA-65 co-signature (CWP-2026-027 A) |
| 2 | Quantum-safe DID `did:jwk` | ML-DSA-65 (FIPS 204) | 1952 B public / 4032 B secret | PHOS PQC Keys, `did:jwk` (AKP, RFC 9964 `kty:AKP`) | Active (production-ready) | Primary long-term DID |
| 3 | X-Wing hybrid KEM | X25519 + ML-KEM-768 (FIPS 203) | 1216 B public / 32 B secret (seed) / 1120 B ct | `workers/ledger-bridge/src/kem.ts`, `GET /kem/xwing/*` | Active (live-verified, 3/3 KAT) | Track `draft-connolly-cfrg-xwing-kem` |
| 4 | SD-JWT VC issuance | Ed25519 / ML-DSA-65 (FIPS 204) | variable | `ledger-bridge/src/sdjwt.ts`, `POST /credential/issue` `/verify` | Active | Dual-signature (Ed25519 + ML-DSA-65) support |
| 5 | FEP-8b32 Object Integrity Proofs | Ed25519 (eddsa-2022, JCS-canonicalized) | 32 B public | `federation-bridge/src/index.ts`, `/publish` + `/inbox` | Active | Hybrid with ML-DSA-65 |
| 6 | Care-proof co-signature | ML-DSA-65 (FIPS 204) | 3309 B signature | `ledger-bridge/src/index.ts`, `/care-proof` | Active (optional, required when `mldsa65_pub` on file) | Default-on once DID registered |
| 7 | TLS 1.3 (public endpoints) | X25519 classical; **hybrid X25519-ML-KEM-768 available** | — | Cloudflare zone (SSL/TLS → Edge Certificates) | Zone setting (see §4) | Enable Post-Quantum at zone level (2026 Q3) |
| 8 | LOVE ledger hash chain | SHA-256 | 32 B digest | `apps/phos/src/workers/love-ledger`, `software/workers/legal-versioning.ts` | Active | Court-admissible; no change needed |

**SD-JWT VC reference implementation:** `@sd-jwt/core` v0.20.0 (OpenWallet Foundation, RFC 9901 +
`draft-ietf-oauth-sd-jwt-vc-17`). Integrated and tested — 8 KEM + 10 federation-bridge tests pass.

**KAT test evidence (2026-10-11):**
- Official X-Wing vectors: `workers/ledger-bridge/test/vectors/xwing-kat.json`
  (3 vectors — seed/eseed/ss/sk/pk/ct — from `draft-connolly-cfrg-xwing-kem`).
- Reproduction: `workers/ledger-bridge/test/kem.test.ts` (unit + KAT) — **10/10**.
- `ledger-bridge` full suite via `node --test test/*.mjs` — **23/23**.
- `packages/sovereign-primitives` (incl. `postQuantum.test.ts` X-Wing KEM
  coverage) — **95/95**.

---

## 3. Certificates & Signing Material

| Certificate / Material | Type | Expiry | Notes |
|------------------------|------|---------|-------|
| Cloudflare edge certificate (p31ca.org, *.workers.dev) | RSA-2048 / ECDSA leaf under Cloudflare CA | Managed (auto-rotate) | Terminates at Cloudflare edge; PQC at edge via zone setting (§4) |
| Actor key (`ACTOR_PRIVATE_KEY` / `ACTOR_PUBLIC_KEY`) | Ed25519 PEM | Long-lived secret | Provisioned per-environment; `did:key` for `federation.p31ca.org` actor |
| Ledger relay signing key (`LEDGER_SIGNER_KEY`) | Ed25519 | Long-lived secret | Signs SD-JWT VCs in `ledger-bridge` |
| PQC vault keys (PHOS) | ML-KEM-768 + ML-DSA-44 + ML-DSA-65 | Ephemeral / user-held | Generated client-side in PHOS **PQC Keys** surface (`/pqc-keys`) |

---

## 4. Hybrid PQC TLS — Clarification (CWP-2026-044, Phase 3)

**Correction of an earlier plan error:** Cloudflare Workers do **not** expose hybrid PQC TLS via a
`wrangler.toml` `compatibility_flags = ["hybrid_pqc_tls"]` entry. No such flag exists. Hybrid
post-quantum key exchange (X25519–ML-KEM-768) on Cloudflare is enabled at the **zone level**
(SSL/TLS → Edge Certificates → "Post-Quantum (preview)"), propagated from Cloudflare's global
edge — not per-Worker.

- Cloudflare targets full PQC across its product suite by **2029**; hybrid key exchange is already
  deployed on its edge today.
- There is **no `CF-PQC-Key-Exchange` response header** in Cloudflare's public API. PQC negotiation
  is observable at the TLS layer (e.g. `X25519MLKEM768` in the ClientHello/ServerHello key-share),
  not via an application header. The plan's Phase 3.3 monitoring premise is therefore not actionable
  as written; monitoring belongs at the TLS-termination/observability layer, not in Worker code.

**Action:** Enable Post-Quantum at the Cloudflare zone level for `p31ca.org` (and subdomains). This
is a dashboard/API step, not a code change. No `wrangler.toml` edit is warranted.

---

## 5. Migration Timeline

| Window | Milestone | Status |
|--------|-----------|--------|
| 2026 Q3 | Enable hybrid PQC TLS at Cloudflare zone level (all public endpoints) | ☐ Pending (zone setting) |
| 2026 Q4 | EUDI Wallet compatibility certification (ESSIF/EBSI-aligned VC issuance + revocation) | 🟡 In progress (CWP-2026-044 Phase 1) |
| 2027 Q1 | Full ML-DSA-65 adoption for all signatures (DID `did:jwk` default) | ☐ Planned |
| 2027 Q2 | Deprecate Ed25519 for long-term storage (retain transit hybrid) | ☐ Planned (per NIST IR 8547, Ed25519 retired 2030) |

---

## 6. Compliance Statement

- **NIST FIPS 203 / 204 / 205** — finalised (2024-08), production-eligible; ML-KEM-768, ML-DSA-65,
  SLH-DSA all present in the stack.
- **US Quantum Computing Cybersecurity Preparedness Act (117-260)** — PQC required for government
  procurements from **2027-01**; P31's ML-DSA-65 / X-Wing baseline satisfies the readiness bar.
- **EUDI Wallet** — mandatory in EU Member States by **end 2026**; P31 credentialing aligns to
  W3C VC Data Integrity 1.1 + SD-JWT VC (draft-17) with `vct`/`sub`/`exp`/`cnf` claims and a
  Status-List-2021-style revocation endpoint.
- **No RSA** is present in any path. **ECDH P-256 was removed** from
  `postQuantum.ts` on 2026-10-11 (replaced by X-Wing). **ECDSA P-256** remains
  in one legacy worker (`workers/care-api/src/lib/pqc.ts:7`), whose verifier now
  fails closed; full remediation is tracked in
  `docs/fix-plans/care-api-pqc-fail-open.md`.
- **Not certified.** P31 uses NIST-standardized algorithms but holds no FIPS
  140-3 / CMVP certificate and has not been externally audited.

---

*Maintained per NIST IR 8547. Update on every key rotation, algorithm change, or new service onboarding.*
