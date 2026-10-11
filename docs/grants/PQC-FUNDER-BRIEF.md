<!-- P31-HEADER
id: p31_grant_pqc_funder_brief_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# PQC Funder Brief — Post-Quantum Cryptography for Care Infrastructure

**Applicant:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158) · willyj1587@gmail.com
**Asset:** Hybrid post-quantum cryptography + composite signatures + SD-JWT credentials
**Verified:** 2026-10-11

> **One line:** P31 builds **tested** post-quantum primitives that let ordinary
> people — neurodivergent people and their caregivers — hold self-sovereign
> identity and care records that survive the quantum transition. The primitives
> are real; the illustrative MCP wrapper is a labelled demo shim.

---

## 1. What is implemented (cite the code, not the slide)

| Capability | Standard | Evidence |
|---|---|---|
| Composite **Ed25519 + ML-DSA-65** signatures (both must verify; fails closed) | FIPS 204 | `packages/sovereign-primitives/src/composite.ts:88` (keygen), `:102` (sign), `:115` (verify), `MLDSA65_SIG_LEN=3309` at `:19` |
| **X-Wing** hybrid KEM (**X25519 + ML-KEM-768**, `draft-connolly-cfrg-xwing-kem`) | FIPS 203 + X25519 | `workers/ledger-bridge/src/kem.ts:46` (keygen), `:51` (encapsulate), `:59` (decapsulate); `packages/sovereign-primitives/src/postQuantum.ts:251` (keygen), `:318` (encrypt), `:339` (decrypt). **All 3 official KAT vectors pass** (`workers/ledger-bridge/test/vectors/xwing-kat.json`) |
| **ML-DSA-65** + **SLH-DSA-128s** signing hybrid | FIPS 204/205 | `postQuantum.ts:227` (sig keygen), `:269` (sign), `:293` (verify) |
| AES-256-GCM over an HKDF-derived key | FIPS 197 | `postQuantum.ts:49`, `:73`, `:318` |
| **ML-DSA-65 SD-JWT** credential issue + verify | FIPS 204, SD-JWT | `workers/ledger-bridge/src/sdjwt.ts:223` (issue), `:262` (sign), `:453` (verify) |
| ML-DSA-65 + composite OIP verification across the federation | FIPS 204 | `workers/federation-bridge/src/index.ts:328`, `:345` |
| Readiness/migration probe | — | `postQuantum.ts:359` `assessPQCReadiness()` |

Engine: `@noble/post-quantum` (pure JS, no WASM). Keys/signatures use the exact
NIST sizes (ML-DSA-65 public key 1952 B, private 4032 B, signature 3309 B —
asserted in `capabilityToken.test.ts`; X-Wing public key 1216 B, ciphertext
1120 B, shared secret 32 B — asserted against the official KAT vectors).

## 2. What is NOT implemented (state this plainly)

- **The MCP tools are a demo shim.** `workers/p31-crypto-mcp/src/index.ts`
  returns synthetic values, tags every response `demoShim: true`, and performs
  no cryptography. It is an interface scaffold, not a compliance artifact.
- **The classical KEM leg is now genuine X-Wing (X25519).** Corrected
  2026-10-11: `postQuantum.ts` previously labelled a P-256 ECDH leg as
  `'X25519+ML-KEM-768'`. The KEM is now the spec **X-Wing** construction
  (`ml_kem768_x25519`), validated against all three official
  `draft-connolly-cfrg-xwing-kem` KAT vectors. (See
  `docs/fix-plans/pqc-xwing-not-spec-compliant.md`.)
- **One legacy worker is still stubbed.** `workers/care-api/src/lib/pqc.ts`
  used an ECDSA P-256 stub with a **fail-open** verifier; it now fails closed
  and remains tracked for real ML-DSA-65/X-Wing wiring
  (`docs/fix-plans/care-api-pqc-fail-open.md`). Do not cite care-api as a
  PQC implementation.
- **No FIPS certification.** P31 uses NIST-standardized algorithms; it does not
  hold a CMVP certificate and should never claim "FIPS-validated."
- **No third-party audit yet.** An independent security review is a funded
  deliverable, not a past achievement.

## 3. Why it matters (the policy tailwind)

- The **NQI Reauthorization** authorizes **$85M/yr to NIST for FY2026–2030**.
- **Executive Order 14412** (2026-06-22), with OMB memo **M-26-15** (2026-06-24),
  directs federal agencies to inventory and migrate to PQC.
- The **FAR will require covered federal contractors to be PQC-compliant by
  2030-12-31** (key establishment), signatures by 2031-12-31.
- Care and identity records have **long confidentiality lifetimes** — exactly
  the data class that "harvest now, decrypt later" attacks target. Families
  are the least able to migrate; the primitives must be free and built-in.

## 4. Funding rails (both)

**Nonprofit-eligible (P31 applies as prime):**

| Funder | Programme | Amount | Deadline |
|---|---|---|---|
| NLnet | **Restack** (Open Internet Stack) — PQC explicitly in scope | €5K–50K | 2026-11-03, 12:00 CET |
| OTF | Internet Freedom Fund | $10K–900K (ideal $50K–200K) | rolling |
| Sloan | Digital Technology (exploratory) | $50K–400K | rolling LOI |

**For-profit-partner route only (see the memo):**

| Funder | Programme | Amount | Constraint |
|---|---|---|---|
| NIST | SBIR (PQC topics) | Phase I ≤$100K / II ≤$400K | prime must be a **for-profit SBC**; P31 = subawardee or STTR research partner |

NIST SBIR is **closed to P31 as prime** — a 501(c)(3) cannot be an SBIR
awardee. See `SBIR-ELIGIBILITY-MEMO.md`.

## 5. The ask

Fund the path from **tested primitives to audited, deployable care
infrastructure**: wire the real primitives into the service surfaces, fund the
**independent security audit**, and publish the family-usable credential
toolkit. Suggested framing per rail:

- **Restack (Nov 3):** PQC + self-sovereign identity as open internet
  infrastructure; European dimension via EUDI-compatible SD-JWT.
- **OTF (rolling):** the privacy/anti-censorship angle — a caregiver's data is
  the most sensitive data there is.

---

## Owner + last verified

`Owner: will` · `Last verified: 2026-10-11`

Re-verify: opentech.fund IFF · nlnet.nl/restack · sbir.gov eligibility · NIST
NQI reauthorization ($85M/yr) · EO 14412 + OMB M-26-15 · FAR PQC clause.
