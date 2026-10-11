<!-- P31-HEADER
id: p31_grant_nlnet_restack_application_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# NLnet Restack — Application (Open Internet Stack)

**Applicant:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158) · willyj1587@gmail.com
**Programme:** **Restack** (the cascade-funding programme of the **Open Internet Stack** initiative)
**Deadline:** **2026-11-03, 12:00 CET** (first call opened 2026-09-03)
**Request:** €50,000 (band €5K–50K; >€50K requires a prior concluded project)
**Lead asset:** Post-quantum cryptography + self-sovereign identity for care
**Verified:** 2026-10-11

> **Scoring:** technical merit **30%** · strategic relevance to OIS **40%** ·
> value for money **30%**. We write to those three explicitly.

---

## Abstract (≤1200 chars — draft)

P31 Labs builds free, post-quantum-secure identity and credential infrastructure
for the people least served by the internet's defaults: neurodivergent people and
family caregivers. Our tested primitives — composite Ed25519 + ML-DSA-65
signatures (NIST FIPS 204), hybrid ML-KEM-768 key encapsulation (FIPS 203), and
SLH-DSA-128s (FIPS 205) — let a household hold self-sovereign digital identity
and selectively disclose care records without a platform seeing them. The same
stack signs EUDI-compatible SD-JWT credentials. This project hardens and deploys
those primitives as reusable open infrastructure: productionize the credential
services, publish the composite-signature library under a permissive license,
fund an independent security audit, and document a family-usable toolkit. The
goal is an open building block any care, aid, or civic service can adopt to make
the web's identity layer quantum-resistant and privacy-preserving by default.

## Strategic relevance to Open Internet Stack (40%)

- **Quantum resistance is open-internet infrastructure.** The FAR requires
  covered contractors to be PQC-compliant by 2030-12-31; NIST's NQI
  reauthorization funds **$85M/yr (FY2026–2030)**. If the open stack does not
  have free PQC identity primitives, the post-quantum web will be proprietary.
- **European dimension:** EUDI-compatible SD-JWT credentials and W3C DIDs make
  P31's output directly reusable in the EU digital-identity ecosystem. **eIDAS 2.0
  acceptance obligations begin 2026-12-24** — from that date public
  administrations must accept EUDI Wallet credentials (Regulation (EU) 2024/1183
  Art. 5f), with regulated private-sector acceptance from 2027-12-24. SD-JWT VC
  (RFC 9901) is the mandated credential format, and P31 builds it for the people
  Europe's systems exclude.
- **Commons building block:** the composite-signature and hybrid-KEM modules are
  generic; the care use-case is the forcing function, not the ceiling.

## Technical merit (30%)

- Real, tested code (cite, don't claim): `packages/sovereign-primitives/src/
  composite.ts` (`COMPOSITE_ALG` `:14`, `compositeSign` `:102`, `compositeVerify`
  `:115`), `postQuantum.ts` (`generateSigningKeyPair` `:227`, `hybridSign` `:269`,
  `hybridEncrypt` `:318`), key/sig sizes asserted in `capabilityToken.test.ts`
  (ML-DSA-65 pk 1952 B, sk 4032 B, sig 3309 B; `MLDSA65_SIG_LEN` `composite.ts:19`).
- The composite **Ed25519 + ML-DSA-65** construction is a sibling to the profiles
  now standardising in `draft-ietf-lamps-pq-composite-sigs`
  (`id-MLDSA65-Ed25519-SHA512`), `draft-ietf-jose-pq-composite-sigs` (adopted from
  the individual `draft-prabel-jose-pq-composite-sigs`; ML-DSA + ECDSA/EdDSA
  composites for JOSE/COSE), and RFC 9980 (OpenPGP composite ML-KEM/ML-DSA) —
  cited for standards context; the alignment itself is WP1 work.
- Working credential services: `workers/ledger-bridge/src/sdjwt.ts` (ML-DSA-65
  SD-JWT issue `:223`, verify `:453`) and `workers/federation-bridge/src/
  index.ts` (ML-DSA-65 + composite OIP verify `:328`, `:345`).
- Deployable on commodity edge (Cloudflare Workers); no WASM, no exotic deps.

## Value for money (30%)

- €50K funds: productionization of 2 services, an **independent security audit**
  (WP3), library release, and documentation. No agency overhead; a small operator
  crew. Restack explicitly funds **security audits and formal security proofs**, so
  the audit is a first-class deliverable, not overhead.
- Deliverables are **reusable by any project** — maximal public return per euro.

## Work plan (draft)

| WP | Deliverable | Evidence of done |
|---|---|---|
| WP1 | Harden + productionize composite-signature & hybrid-KEM libraries; publish under permissive license | tagged release + CI green |
| WP2 | Deploy ML-DSA-65 SD-JWT credential issue/verify as a public service | live endpoint + conformance tests |
| WP3 | Independent security audit | published report |
| WP4 | Family-usable toolkit + docs | guide + reference integration |

## AI-authorship statement (required by Restack policy v1.1)

NLnet's GenAI policy (v1.1, effective 2026-01-26) is the governing version as of
this pass — no revision has been published. It **excludes** work that is mostly
LLM-generated ("vibecoding"), and **requires disclosure** plus a **prompt
provenance log** (model, dates/times, prompts, and unedited output). This
application and the underlying code are **human-authored**: the primitives were
written by P31's operator, reviewed against NIST FIPS 203/204/205, and carry
tests that must pass. AI tooling was used only as an assistant for drafting and
refactoring; every design decision, algorithm choice, and security claim is
human-made and reviewable in the repository history. A prompt-provenance log
covering this proposal is maintained in `docs/grants/prompt-provenance-log.md`.

## Honesty notes

- The `p31-crypto-mcp` MCP wrapper is a **labelled demo shim** — not cited here.
- The hybrid KEM is now **genuine X-Wing** (`X25519 + ML-KEM-768`, per
  `draft-connolly-cfrg-xwing-kem`) via `@noble/post-quantum`'s `ml_kem768_x25519`
  preset; the earlier P-256 ECDH classical leg was replaced 2026-10-11
  (`docs/fix-plans/pqc-xwing-not-spec-compliant.md`), and keygen/encapsulate/
  decapsulate are verified against the **three official KAT vectors**
  (`workers/ledger-bridge/test/vectors/xwing-kat.json`, asserted in
  `kem.test.ts:106-123`). Note: the X-Wing draft is an
  Internet-Draft (`draft-connolly-cfrg-xwing-kem-11`, published 2026-09-23,
  expires 2027-03-27, Independent Submission stream) — we cite it as
  work-in-progress, not as a final standard.
- No CMVP FIPS certificate; we use NIST-standardized algorithms, we do not claim
  FIPS *validation*.
- Prior Aug-1 TALER/Fediversity proposals were **submitted before** NLnet's
  transition to the Open Internet Stack; carry-over into the Nov-3 Restack call is
  unconfirmed (see `SUBMISSION-CHECKLIST.md`).

## Form fields (final char counts on submit)

Abstract 1200 · Previous projects 2500 · Budget 2500 · Comparison 4000 ·
Challenges 5000 · Ecosystem 2500. Re-run the character-count check before
submitting.

---

## Owner + last verified

`Owner: will` · `Last verified: 2026-10-11`

Re-verify: nlnet.nl/restack (guide, eligibility, call 2026-11R; €5K–50K typical,
max €150K, PQC in scope, EU-priority, scoring 30/40/30) ·
nlnet.nl/foundation/policies/generativeAI (v1.1 in force as of 2026-10-11).
