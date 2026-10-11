<!-- P31-HEADER
id: p31_grant_otf_concept_note_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# OTF Concept Note — Privacy Payments for Care Economies

**Applicant:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158) · willyj1587@gmail.com
**Programme:** Open Technology Fund — Internet Freedom Fund (rolling; Stage 1 = Concept Note, Stage 2 = Proposal by invitation)
**Asset:** Privacy-preserving payments (GNU Taler bridge) for care economies
**Request:** **$150,000 over 12 months** (ideal OTF IFF band $50K–$200K / 6–12 mo)
**Verified:** 2026-10-11

---

## 1. The problem

Care work and mutual aid are increasingly mediated by platforms that **see every
transaction**. For a caregiver buying a medication refill, or a neurodivergent
creator selling a template, mainstream payment rails log the payer, the payee,
and the amount — there is no widely-used private way to be paid. Surveillance of
payment metadata is a direct **anti-censorship and privacy** threat to
marginalized communities — and a small, adversarial, or discriminatory
institution can de-platform an entire household's income.

This is not hypothetical: community organizers report that **mutual-aid groups,
bail funds, and abortion funds are finding themselves in the crosshairs** of
financial surveillance, with payment records subpoenaed and identities linked to
transaction histories — chilling the entire culture of mutual aid (Fight for the
Future; GEO "Beyond Community Currencies" session on mutual-aid financial
surveillance). Privacy is not a feature for these communities; it is the
precondition for the work to happen at all.

The population is large and growing: the U.S. care economy is a **$648 billion**
market (World Economic Forum / Brookings, 2026), with **48 million paid care
workers** and **156.6 million adults** providing unpaid care (KU Care Board,
2026). The **direct care workforce** — home care aides, nursing assistants, and
residential care aides — is **nearly 5.8 million people, the largest occupation
in the United States**, with **9.6 million job openings projected 2025–2035**
(886,000 of them new jobs) and median annual earnings **under $28,500** (PHI,
*Direct Care Workers in the United States: Key Facts 2026*). Globally the ILO
values unpaid care work at **$11 trillion** (~9% of GDP),
and the WHO projects a **10-million health-worker shortfall by 2030**. These are
exactly the people whose payment privacy is today mediated by platforms that see
every transaction.

## 2. The approach

P31 has built a **GNU Taler** bridge so LOVE credits (the care-economy ledger)
can be withdrawn as **blind-signed digital cash**: the exchange validates the
coin without learning who spends it where. This is privacy-by-cryptography, not
privacy-by-policy — the merchant cannot correlate a spend back to a caregiver.

Complementary, already-built pieces:

- **Self-sovereign identity** — W3C DIDs + selective-disclosure SD-JWT
  credentials, so a payment can carry proof of eligibility without revealing
  identity.
- **Post-quantum-ready core** — the same credentials are signed with
  Ed25519 + ML-DSA-65, so payment/eligibility proofs survive the quantum
  transition.

The fundable work is hardening and **deploying** this. GNU Taler v1.5 shipped in
March 2026; the production exchanges in operation today are **Taler Operations AG**
(Switzerland, CHF) and the regional **eNetzbon** deployment (taler.net). No care economy
has one. The ask funds the **bridge + wallet flows**, an **auditable privacy
threat model**, and **localization** for the caregiver population OTF serves.

**Legal framing (state it, don't hide it):** operating a Taler *exchange* is
operating a payment service provider — it needs an e-money-issuer (EMI) or bank
licence (Taler Exchange Operator Manual). P31 is a 501(c)(3), not a licensed PSP,
so the deployment path is **limited-reach / internal** (care-grant and donation
flows, not a commercial exchange) — the "limited reach (local, internal)" case
that needs no EMI licence — or a **partner-run licensed exchange leg**. Taler's
KYC/AML triggers (reserve-level KYC, KYB above threshold) are documented and
acknowledged; under the partner-run licensed leg they would be handled by the
licensed partner, not waved away.

## 3. Why OTF

- Payments privacy is core internet-freedom tooling; censoring a person's money
  is one of the most effective ways to silence them.
- P31 is a **nonprofit** — OTF IFF funds for- and nonprofits, rolling, with a
  ~6–8 week decision and an ideal band ($50K–$200K) that fits the deliverable.
- OTF prefers **real, usable tools** over prototypes; P31 ships a deployed
  Workers fleet (173 workers) with the Taler bridge, wallet flows, and credential
  services live and tested — a production exchange leg is explicitly out of scope
  (§4).

## 4. Honesty notes (submitted as part of the note)

- The Taler flows are **built but not yet a production exchange**. P31 is **not a
  licensed payment service provider**: a commercial exchange is out of scope and
  would require a bank/EMI partner. The ask is the **limited-reach / internal**
  leg plus hardening, not a licence application.
- The `p31-crypto-mcp` wrapper is a **labelled demo shim** — not cited here.

### 4.1 Internal drafting notes (NOT part of the submission)

- OTF **FOSS Sustainability Fund** is *not* the target here: it requires a
  release **3+ years** old with a real user base. P31 is **not yet eligible**.
  This ask is the **Internet Freedom Fund**.

## 5. Draft budget shape (placeholders)

| Line | Item | Amount |
|---|---|---|
| 1 | Lead / operator salary | $60,000 |
| 2 | Engineering (Taler bridge hardening, wallet flows) | $45,000 |
| 3 | Independent privacy/security review | $22,000 |
| 4 | EMI/PSP regulatory assessment | $3,000 |
| 5 | Localization + caregiver usability testing | $12,000 |
| 6 | Admin (≤10%) | $8,000 |
| | **Total** | **$150,000** |

Work packages the budget buys: (1) harden the Taler bridge + wallet flows and run
them against a licensed/limited-reach exchange leg for care-economy payments;
(2) fund the privacy audit of the SD-JWT credential flow and the Taler bridge;
(3) localize for caregivers — the LOVE-credit ledger and the pickle-name identity
layer as the privacy spine; (4) a short EMI/PSP regulatory assessment — a
separate budget line (line 4 above), not buried in the audit line.

## 6. Next step

Submit Stage 1 Concept Note via OTF's portal (rolling). On invitation, expand to
the Stage 2 proposal with the budget above and the threat model.

---

## Owner + last verified

`Owner: will` · `Last verified: 2026-10-11`

Re-verify: opentech.fund/program/internet-freedom-fund (rolling, ideal
$50K–$200K / 6–12 mo, ceiling ~$300K) · opentech.fund FOSS Sustainability Fund
(3+ yr release requirement — not yet eligible).
