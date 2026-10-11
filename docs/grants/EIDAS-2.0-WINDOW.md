<!-- P31-HEADER
id: p31_grant_eidas_2_0_window_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# eIDAS 2.0 — The December 2026 Window

**For:** grant narratives (OTF, Restack, Sloan, Gates) · **Verified:** 2026-10-11
**Legal instrument:** Regulation (EU) 2024/1183 (eIDAS 2), amending (EU) No 910/2014
**P31 position:** EUDI-compatible **by construction** — we already issue the
credential format Europe just mandated.

> This is a **grant narrative, not a compliance burden.** We build the credential
> format Europe just mandated, for the people Europe's systems exclude.

---

## 1. The two dates (the narrative arc)

| Date | What happens | Who is obliged |
|---|---|---|
| **2026-12-24** | EUDI Wallets arrive; **public-sector acceptance** begins | Member States issue wallets; **public administrations** must accept them (Art. 5f) |
| **2027-12-24** | **Regulated private-sector acceptance** bites | Large/medium relying parties in listed sectors (e.g. PSD2 banks) must accept the wallet on request |

> **Precision:** the regulated-private-sector clock reads as "within 36 months of
> the relevant Implementing Acts" in some analyses (Sphereon), not a single hard
> date in every sector. The headline is the two-date arc; the 36-month reading is
> the nuance a funder should not be allowed to overstate.

The window is **open now**, with a **12-month runway** before acceptance pressure
fully arrives. The urgency argument: the excluded need credentials *in the mandated
format* before the acceptance deadline arrives, or they are locked out of a second
digital system.

## 2. The mandated formats

Conformant issuance under eIDAS 2 requires support for the **mandated credential
formats**:

- **SD-JWT VC** — selective disclosure for JWTs, now **RFC 9901**.
- **ISO/IEC 18013-5** (mDL / mdoc).
- **W3C VC (VCDM 2.0)** — permitted for non-qualified EAAs.

Plus **trust-registry integration**, **revocation infrastructure**, and
**audit-ready issuance records**.

**Relying-party registration (new implementing acts).** Member States must
authorise **at least one certificate authority** to issue **wallet-relying-party
registration certificates**, issued automatically and without undue delay
(Implementing Regulation (EU) 2026/1730, amending 2025/848). Wallets must
authenticate and validate the relying party's registration certificate, and
"silence or pre-ticked boxes shall not suffice for explicit approval"
(Implementing Regulation (EU) 2026/1731). A third act (2026/1735) aligns the
framework with the latest Architecture and Reference Framework (ARF 2.9.0, which
finalised Topic X — Relying Party Registration — on 2026-05-21). Certificate
format: **ETSI TS 119 475 V1.2.1**.

## 3. Why P31 is EUDI-compatible by construction

P31's sovereign identity stack already implements the mandated shape (see
`docs/EUDI-READINESS.md`, `docs/EUDI-WALLET-INTEGRATION.md`):

| eIDAS 2 requirement | P31 implementation |
|---|---|
| W3C DID Core | `did:key` (Ed25519), `did:jwk` (ML-DSA-65, RFC 9964 `kty:AKP`), `did:web` resolvers |
| DID services / discovery | `CredentialIssuer` + `CredentialVerifier` service endpoints at `/actor` |
| **SD-JWT VC (RFC 9901)** | `typ:dc+sd-jwt`, `_sd_alg:sha-256`, issued by `workers/ledger-bridge/src/sdjwt.ts` |
| Selective disclosure | salted disclosures; reveal a subset at issue/verify |
| Revocation | Status-List-2021-style endpoint |
| Post-quantum | Ed25519 + ML-DSA-65 composite (FIPS 204); hybrid KEM (FIPS 203) |

P31 adds what the baseline EUDI profile does not: a **post-quantum signature** leg
and a **deterministic privacy-label layer** (`docs/specs/pickle-names.md`) so a
credential can name no human while still disclosing only chosen claims.

## 4. The population

eIDAS 2's own observers note the exclusion risk: wallet access can become a
**two-tier system** when authentication assumes devices, biometrics, or digital
literacy that marginalised people do not have. P31 builds for exactly that edge —
neurodivergent people and family caregivers — using selective disclosure so a person
proves *what is needed* (e.g. care eligibility) without revealing *who they are*.

## 5. Fundable framing

- **Restack (Nov 3):** EUDI-compatible SD-JWT is the "European dimension" — the
  output is reusable in the EU digital-identity ecosystem.
- **OTF (rolling):** privacy-preserving credentials for care payments; the
  credential carries eligibility without identity.
- **Sloan / Gates:** SD-JWT VC + DIDs for the excluded, post-quantum-ready.

## 6. Honesty notes

- P31's SD-JWT implementation is **not certified** and has not run the official
  EUDI conformance harness; we claim **format compatibility by construction**, not
  certification.
- The January-2025 ARF and the implementing acts continue to evolve; the trust
  registry/registration workstream is **future work**, not shipped.
- Relying-party registration with a national register is a **future step** if P31
  wants to act as an accepted verifier in the EU ecosystem — format compatibility
  is not registration.
- The classical KEM leg is P-256 ECDH; the post-quantum leg is ML-KEM-768.

## Sources (re-verify before citing)

- Regulation (EU) 2024/1183, Art. 5f — reliance-party acceptance.
- Implementing Regulation (EU) 2026/1730 — wallet-relying-party registration certificates (amends 2025/848).
- Implementing Regulation (EU) 2026/1731 — access/registration certificate authentication + explicit-approval rule.
- Implementing Regulation (EU) 2026/1735 — ARF alignment.
- ETSI TS 119 475 V1.2.1 — relying-party registration certificate format.
- RFC 9901 — Selective Disclosure for JSON Web Tokens (SD-JWT).
- European Commission, eIDAS 2 / EUDI Wallet regulation page.
- `docs/EUDI-READINESS.md` — P31 compliance matrix (internal).

---

`Owner: will` · `Last verified: 2026-10-11` · Re-verify by checking EUR-Lex for
Regulation (EU) 2024/1183 and the RFC 9901 index entry each quarter.
