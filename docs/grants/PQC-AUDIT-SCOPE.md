<!-- P31-HEADER
id: p31_grant_pqc_audit_scope_20261011_v1.0
type: research
component: docs
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# PQC Audit Scope — Independent Security Review of the P31 Cryptographic Surface

**Prepared:** 2026-10-11 · **Owner:** will · **Status:** draft scope for funded audit

> This is the **funded deliverable** for P31's post-quantum work, not a past
> achievement. P31 does not hold a FIPS 140-3 / CMVP certificate and has not been
> independently audited. The goal of this scope is to take the already-tested,
> KAT-validated primitives through an external, evidence-producing review.

---

## 1. Objective

Obtain an independent security assessment of P31's post-quantum (PQ) and hybrid
cryptographic implementation, with three outputs:

1. A findings report mapping each claim to `file:line` evidence.
2. Verification (or refutation) of the X-Wing KAT conformance and composite
   signature logic.
3. A prioritized remediation list with severities.

## 2. In scope

| # | Surface | Location | What to verify |
|---|---------|----------|----------------|
| S1 | X-Wing hybrid KEM | `workers/ledger-bridge/src/kem.ts` | Delegates to `ml_kem768_x25519`; reproduces the official `draft-connolly-cfrg-xwing-kem` KAT vectors; size invariants (pk 1216 / ct 1120 / ss 32 / sk 32) |
| S2 | Hybrid KEM (package) | `packages/sovereign-primitives/src/postQuantum.ts:251,318,339` | X-Wing keygen/encrypt/decrypt; HKDF→AES-256-GCM; self-contained ciphertext; no P-256 |
| S3 | Composite signatures | `packages/sovereign-primitives/src/composite.ts:88,102,115` | Ed25519 + ML-DSA-65 both required; **fails closed** |
| S4 | PQ SD-JWT | `workers/ledger-bridge/src/sdjwt.ts:223,262,453` | ML-DSA-65 issuance + verification; tamper resistance; KB-JWT binding |
| S5 | Federation OIP | `workers/federation-bridge/src/index.ts:328,345` | Composite verification before accepting activities |
| S6 | Capability tokens | `packages/sovereign-primitives/src/capabilityToken.ts` | Size assertions; fail-closed verification |
| S7 | Legacy worker | `workers/care-api/src/lib/pqc.ts` | Confirm the fail-closed verifier; assess the P-256 stub exposure |
| S8 | MCP crypto shim | `workers/p31-crypto-mcp/src/index.ts` | Confirm `demoShim: true` labelling; no false crypto claims |

> **Draft-status note (X-Wing).** P31 implements
> `draft-connolly-cfrg-xwing-kem-11` (published 2026-09-23, expires 2027-03-27),
> an **Active Internet-Draft** on the Independent Submission stream — not adopted
> by the CFRG, intended status Informational. The construction is unchanged from
> `-10` (same sizes, combiner, and key derivation), so the KAT conformance stands.
> The audit must treat X-Wing as a work-in-progress **Internet-Draft, not a final
> standard**: conformance is judged against the draft text and its official KAT
> vectors, never against an RFC that does not exist yet.

> **Implementation note (`@noble/post-quantum`).** The KEM delegates to
> `@noble/post-quantum@0.6.1`, a pure-JS implementation of NIST-standardized
> algorithms (ML-KEM-768 = FIPS 203; ML-DSA-65 = FIPS 204). It is **not
> FIPS-validated** — there is no CMVP certificate for it. The audit assesses
> P31's usage, key handling, and integration; it does not (and cannot) certify
> the library under CMVP.

## 3. Out of scope

- The `@noble/*` library internals (audited upstream; P31 relies on its KAT suite).
- Cloudflare edge TLS termination (provider-managed; zone-level PQC setting).
- Product/UI code not in the crypto path.
- The `software/` mirror tree (stale duplicate; see
  `docs/fix-plans/software-mirror-stale.md`) unless explicitly reconciled first.

## 4. Questions for the auditor

1. Does `kem.ts` reproduce all published X-Wing KAT vectors exactly, and are its
   length checks complete?
2. Is the HKDF→AES-GCM composition in `postQuantum.ts` sound (schedule,
   domain separation, IV handling)?
3. Does `compositeVerify` fail closed on every malformed input?
4. Is the SD-JWT `_sd_alg` / disclosure hashing correct and non-malleable?
5. Are there remaining fail-open paths anywhere in the verification surface?
6. Is the X-Wing secret key (32-byte seed) handled with adequate entropy and
   zeroization expectations for a pure-JS runtime?

## 5. Deliverables

- Written findings with severity (Critical/High/Medium/Low/Info) and `file:line`.
- KAT reproduction result (pass/fail with vectors).
- Remediation PR or patch set where feasible.

## 6. Standards & references

- `draft-connolly-cfrg-xwing-kem-11` (X-Wing; combiner + KAT vectors) — published
  2026-09-23, expires 2027-03-27; Active Internet-Draft, Independent Submission
  stream; cited as work-in-progress (see §2 note).
- `@noble/post-quantum@0.6.1` — pure-JS, **not FIPS-validated** (no CMVP
  certificate); implements FIPS 203/204/205 algorithms.
- FIPS 203 / 204 / 205; NIST IR 8547 (migration guidance).
- Executive Order 14412 (2026-06-22) + OMB M-26-15 (2026-06-24).
- Internal: `docs/grants/NIST-IR-8547-COMPLIANCE.md`,
  `docs/CRYPTOGRAPHIC-INVENTORY.md`, `docs/fix-plans/care-api-pqc-fail-open.md`.

## 7. Known issues already fixed (for auditor verification)

- Bespoke transcript-less KEM combiner → replaced with the spec X-Wing preset
  (`docs/fix-plans/pqc-xwing-not-spec-compliant.md`).
- P-256 mislabeled as X25519 and a non-round-tripping hybrid encrypt
  (`docs/fix-plans/postquantum-hybrid-kem-broken.md`).
- Fail-open verifier in `care-api` → now fails closed
  (`docs/fix-plans/care-api-pqc-fail-open.md`).

## 8. Indicative budget & timeline

Aligned to NLnet **Restack** (€5K–50K; deadline 2026-11-03 12:00 CET). A scoped
review of S1–S8 is a 2–4 week engagement for a single senior reviewer; budget
supports a KAT-conformance focus (S1–S3) plus a targeted fail-open sweep (S2,S3,S4,S6,S7).

- **KAT reproduction line item:** the auditor independently re-derives the three
  official `draft-connolly-cfrg-xwing-kem` KAT vectors (keygen from seed,
  encapsulate, decapsulate) against the stored vectors in
  `workers/ledger-bridge/test/vectors/xwing-kat.json`, and confirms the test
  suite's reproduction in `workers/ledger-bridge/test/kem.test.ts` — this is an
  explicit budgeted task, not incidental verification.
