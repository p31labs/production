<!-- P31-HEADER
id: p31_grant_asset_portfolio_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Fundable Asset Portfolio — Seven One-Pagers

**Applicant:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158) · willyj1587@gmail.com
**Verified:** 2026-10-11 · Each asset: population · outcome · metric · evidence.

---

## 1. Post-Quantum Cryptography

- **Population:** families whose care/identity records must stay confidential for decades.
- **Outcome:** hybrid Ed25519+ML-DSA-65 signatures + ML-KEM-768 KEM, deployed at the edge.
- **Metric:** exact NIST key/sig sizes asserted in tests (`capabilityToken.test.ts`).
- **Evidence:** `packages/sovereign-primitives/src/composite.ts:88/102/115`, `postQuantum.ts:190/291`; `workers/ledger-bridge/src/sdjwt.ts:223/453`; `workers/federation-bridge/src/index.ts:328`.
- **Funder fit:** Sloan DT (rolling LOI, up to $1.25M), Restack (Nov 3), OTF. *(NIST SBIR = partner-only, 2027.)*

## 2. Privacy Payments

- **Population:** caregivers and mutual-aid recipients who cannot be seen transacting.
- **Outcome:** LOVE credits withdrawn as GNU Taler **blind-signed** digital cash.
- **Metric:** payer/payee unlinkability (exchange learns neither).
- **Evidence:** `taler-bridge-billing`, `btcpay-gateway`, `x402`, `creation-accountant/taler-cbs`.
- **Funder fit:** OTF Internet Freedom Fund (rolling — ⚠️ appropriations under defunding attempt). See `OTF-CONCEPT-NOTE.md`.

## 3. Sovereign Identity

- **Population:** neurodivergent people and caregivers who must prove eligibility without revealing identity.
- **Outcome:** W3C DIDs + selective-disclosure SD-JWT credentials + the **pickle-name** privacy layer.
- **Metric:** deterministic, collision-free pickle names (11 tests); SD-JWT issue/verify round-trips.
- **Evidence:** `pickle-names/index.ts:79`, `passports.ts:25`; `sdjwt.ts`; `phenix-wallet`, `shared-identity`, `cognitive-passport`.
- **Funder fit:** Gates DPI (Civitas ID $500K/2yr precedent, Aug 2026), Sloan, Restack.

## 4. Justice / Online Dispute Resolution

- **Population:** people in low-stakes disputes priced out of courts.
- **Outcome:** blind settlement offers + 2-of-3 multi-sig escrow + hash-sealed evidence.
- **Metric:** evidence integrity verifiable against a SHA-256 chain; escrow needs 2-of-3.
- **Evidence:** `mcp-justice`, `justice-hub` (case create, escrow, evidence deposit/verify, ODR offer/resolve).
- **Funder fit:** LSC TIG (needs LSC-grantee partner; 2027 pre-apps early April); Gates DPI.

## 5. Care Economy

- **Population:** family caregivers and the people they care for.
- **Outcome:** spoon-capacity model (low → less UI; crisis → halt) + LOVE ledger that makes care work visible and dignified.
- **Metric:** spoon/crisis transitions enforced in surfaces; LOVE issuance is formula-clamped 1–50.
- **Evidence:** `love-ledger`, `bonding`, `bros/dads` MCP tools, spoon guide.
- **Funder fit:** Humanity AI (nearest deadline, $250K LOI drafted), Pivotal Ventures (2027, challenge-driven).

## 6. Agent Governance & Provenance

- **Population:** anyone whose AI agent acts on their behalf.
- **Outcome:** every agent action signed and hash-chained; approval tokens signed Ed25519+ML-DSA-65; X-Wing KEM for transport.
- **Metric:** 25-check gate incl. negative-controls proves violations are caught; ledger chain verifies.
- **Evidence:** `verify-chain.mjs`, `veto-check.mjs`, capability tokens, CAS store.
- **Funder fit:** Humanity AI (primary), Restack, Mozilla Democracy x AI (2027 cohort).

## 7. Design System (credibility layer)

- **Population:** any team building accessible care UIs.
- **Outcome:** 32 installable components (12 autonomous / 20 supervised) with token contracts and required ARIA; the **[P31] canon**.
- **Metric:** `registry.json counts.components = 32`; gate enforces token/prop/ARIA conformance.
- **Evidence:** `packages/design-core/registry.json`; `@p31ca/canon`, `@p31ca/design-core`.
- **Funder fit:** not a standalone grant target — the credibility layer that de-risks every other asset.

---

## Cross-cutting

- **Privacy spine:** every asset addresses people by **pickle codename**, never a real name.
- **Model:** grants fund the work; the software stays free. Design system = credibility, not product.
- **Honesty:** the `p31-crypto-mcp` wrapper is a labelled demo shim; no CMVP certificate; classical KEM leg is P-256.

---

`Owner: will` · `Last verified: 2026-10-11`
