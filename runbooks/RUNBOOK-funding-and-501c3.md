<!-- P31-HEADER
id: p31_runbook_funding_501c3_20261011_v1.0
type: runbook
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# RUNBOOK-funding-and-501c3

> The onboarding runbook for P31 Labs' funding function. A fresh operator reads
> this and knows the model, the verified landscape, the exact calendar, and the
> next executable step — without any chat history.
>
> **Thesis, verified:** P31 Labs is a 501(c)(3) public-interest technology
> organization. It is not a software vendor. The design system is the
> **credibility layer**; the crypto, identity, payments, justice, and care
> assets are the **fundable goods**. Grants fund the salary; the software stays
> free. Power to the people, power to the creators.

---

## When to use

You are:
- packaging a fundable asset for a funder,
- deciding which call to submit to next,
- asked "how do we make money without selling the software," or
- about to show the crypto/identity stack to a reviewer.

Do **not** use this runbook to build commercial-license or pricing-tier
infrastructure. That frame is retired. See *Decision log*.

---

## Prerequisites

- **Entity:** P31 Labs, Inc. — Georgia Domestic Nonprofit; EIN 42-1888158;
  501(c)(3) determination confirmed **2026-09-23** (IRS letter on file).
  Operator: William R. Johnson (willyj1587@gmail.com).
- **Workspace:** `/home/p31/production`. Gate: `pnpm gate`.
- **Funder-facing files** live in `docs/grants/` and carry a `P31-HEADER`.
  Procedure runbooks live in `runbooks/` (six-section form).
- **Honesty precondition:** no funder-facing document may claim a capability
  the code does not implement. See *Phase 0* and *Common pitfalls*.

---

## The model (four layers)

| Layer | Mechanism | Precedent | Anchor |
|---|---|---|---|
| **1. Grants** | Institutions pay for public goods to exist. **Funds the salary.** | Freenet (NPT $200K), Benetech (nonprofit, ~$5M rev), Civitas ID ($500K Gates) | primary |
| **2. Donations / pay-what-you-want** | Tax-deductible; the values signal, not the revenue engine | Wikimedia, Signal, Tor | secondary |
| **3. Services** | Hosting, integration, custom theming, training | Red Hat / Matrix: software free, services paid | secondary |
| **4. Creative products** | Skins, templates, creator marketplace | Envato/ThemeForest, but nonprofit | later |

The salary is decoupled from the software's users. Layer 1 carries it.

---

## The verified funding landscape (as of 2026-10-11)

> Re-verify before every submission. Deadlines and eligibility rules move.

| Funder | Programme | Amount | Deadline | Eligibility | Fit |
|---|---|---|---|---|---|
| **Humanity AI** | Communities Leading on AI | $75K–$1M, ≤3 yr | **2026-10-21, 7:59pm ET** | US 501(c)(3) lead | care economy, agent governance, community-led AI |
| **NLnet** | **Restack** (Open Internet Stack) | €5K–50K (max €150K/project) | **2026-11-03, 12:00 CET** | anyone incl. nonprofits | PQC (explicitly in scope), identity, payments |
| **OTF** | Internet Freedom Fund | $10K–$900K (ideal $50K–$200K) | **rolling** (~6–8 wk decision) | individuals + orgs, for- or nonprofit | privacy, anti-censorship, security |
| **OTF** | FOSS Sustainability Fund | $150K–$400K, ~24 mo | rolling (annual cycle) | FOSS released **3+ yrs** + real user base | the full stack (not yet eligible) |
| **NIST** | SBIR (PQC + identity topics) | Phase I ≤$100K / II ≤$400K | **2026-05-22 → 2027-07-07** | **for-profit SBC only** | PQC (partner-gated) |
| **Sloan** | Digital Technology (exploratory) | $50K–$400K | rolling LOI | 501(c)(3) | open-source infrastructure |
| **Gates** | Digital Public Infrastructure | ~$500K / 2 yr | invitation / LOI | 501(c)(3) | sovereign identity (Civitas ID model) |
| **LSC** | Technology Initiative Grant | $35K–$300K | Apr cycle (2026 closed) | needs LSC-grantee partner | justice / ODR |

**Policy tailwind (PQC):** the NQI Reauthorization authorizes **$85M/yr for NIST
FY2026–2030**; two executive orders (2026-06-22) accelerate federal PQC
migration; the **FAR will require covered federal contractors to be
PQC-compliant by 2030-12-31**. This is why PQC is the highest-urgency asset —
and why the SBIR nonprofit block hurts (see below).

### Restack specifics (the NGI successor — get these right)
- It is **Restack**, the cascade-funding programme of the **Open Internet
  Stack** initiative (Horizon Europe, EC Open Source Strategy). NLnet leads a
  consortium. **First call: opened 2026-09-03, deadline 2026-11-03 noon CET.**
- **€5K–€50K** typical; **max €150K per proposal**, and >€50K **must** follow a
  successfully concluded smaller project.
- €7M total, 2026–2030. Sibling funds **CodeSupply** (supply-chain packaging
  metadata) and **ELFA** share the same deadline.
- Open to anyone; EU/Horizon-associated **priority**, but exceptional non-EU
  proposals with a clear **European dimension** are eligible.
- Scoring: technical merit **30%**, strategic relevance to OIS **40%**, value
  for money **30%**.
- **Strict AI policy:** work that is (mostly) LLM-generated ("vibecoding") is
  **not eligible**. Document human authorship.

### SBIR reality (do not relearn this the hard way)
SBIR/STTR awardees must be **for-profit** small business concerns. A 501(c)(3)
**cannot** be the SBIR prime — it may only be a subcontractor/sub-grantee or the
STTR research-institution partner. Therefore NIST SBIR is **closed to P31 as
prime**. The two viable routes: (a) **partner with an eligible for-profit SBC**
(prime) with P31 as subawardee, or (b) pursue the nonprofit-eligible rails
(OTF, Restack, Sloan, NSF-as-partner) in parallel. "Fill all the cracks."

---

## Steps

### Phase 0 — Honesty fixes (blocks all funder-facing work)

1. **Correct `docs/grants/NIST-IR-8547-COMPLIANCE.md`.**
   - Executive summary swaps FIPS 205/206. Correct mapping:
     **FIPS 203 = ML-KEM, FIPS 204 = ML-DSA, FIPS 205 = SLH-DSA.**
   - "2400-byte shared secret" is wrong; the ML-KEM-768 shared secret is
     **32 bytes** (2400 is the decapsulation key).
2. **Resolve the `p31-crypto-mcp` mock.** `workers/p31-crypto-mcp/src/index.ts`
   returns hardcoded data: `pqc_verify` always `{valid:true}`; signatures and
   KEM ciphertexts are random hex; `pqc_audit` emits false `✅ FIPS 203/204`
   claims; the server-card advertises algorithms it does not wire.
   - **Preferred:** wire the tools to the **real** primitives in
     `packages/sovereign-primitives/src/postQuantum.ts` / `composite.ts`.
   - **Minimum, until then:** relabel as a **demo shim** and strip every
     compliance claim. Nothing false ships.
3. **Reconcile NGI/OIS status.** `SUBMISSION-CHECKLIST.md` shows the NLnet
   portal submission *unchecked*; `OPEN-INTERNET-STACK-RETARGET.md` claims
   submitted with codes. Correct the record to: *"submitted for the Aug-1 run;
   NLnet migrated the transition to Open Internet Stack (Restack), deadline
   2026-11-03; carry-over of the Aug submissions unconfirmed — verify with
   NLnet before assuming a decision is pending."* Stop saying "filed / decided."

> **Why Phase 0 first:** every funder document inherits these claims. A
> corrected NIST doc and an honest crypto surface are the difference between a
> credible application and a partially false one.

### Phase 1 — The nearest deadline (Humanity AI, 2026-10-21)

4. **Write the `Humanity AI` LOI** — 2-page LOI + 1-page budget (placeholders).
   - Lead: P31 Labs 501(c)(3), US-based.
   - Community spine: **neurodivergent people + family caregivers** governing
     the AI that mediates their care. The ecosystem (education / labor-economy
     / arts-culture) is breadth around that spine — not a list of seven assets.
   - Follow the call's rule: it funds **community-led** work, and **excludes**
     "adoption of specific AI products" and research that does not advance
     community leadership. Frame accordingly.

### Phase 2 — The highest-alignment asset (PQC, parallel rails)

5. **Package PQC** as a standalone unit:
   - `packages/quantum-core/README.md` — what is **implemented** (cite
     `file:line` evidence from `postQuantum.ts` / `composite.ts`) vs. roadmap.
   - `docs/grants/PQC-FUNDER-BRIEF.md` — honest scope; funders across **both**
     rails: nonprofit-eligible (OTF, Restack, Sloan) **and** the for-profit
     partner route (NIST SBIR via STTR).
   - `docs/grants/SBIR-ELIGIBILITY-MEMO.md` — the 501(c)(3) bar, the for-profit
     partner route, the for-profit-arm option.

### Phase 3 — Fastest cheque + pipeline

6. **Write the OTF concept note** (`docs/grants/OTF-CONCEPT-NOTE.md`) — one
   asset: privacy payments (Taler) **or** sovereign identity (SD-JWT). Stage 1
   is a short Concept Note; Stage 2 (Proposal) is by invitation.
7. **Write the Restack application** (`docs/grants/NLNET-RESTACK-APPLICATION.md`)
   — deadline 2026-11-03. Lead with PQC (explicitly in scope). Document human
   authorship to satisfy the AI policy.
8. **Turn on donation channels** — Open Collective (fiscal hosting), GitHub
   Sponsors (p31labs org), BTCPay (self-hosted, Tor model), and a `/donate`
   page with the 501(c)(3) tax-deductible language.
9. **Extend the grant calendar to v4** with the verified table above and a
   ≥30-day deadline-alert check.

### Phase 4 — 90 days

10. **Package all seven fundable assets** (one-pager each: population + outcome
    + metric + live demo): PQC · privacy payments · sovereign identity ·
    justice/ODR · care economy · agent governance · design system.
11. **Write the case study** (`docs/grants/CASE-STUDY.md`) — the proof: adoption
    (23/32 components across 8 surfaces), 11 gates each proven fail-able,
    hash-chained ledger, spoons/crisis mode, real & tested PQC primitives.

---

## How to verify

```bash
cd /home/p31/production

# Phase 0 — honesty
grep -n "FIPS 203" docs/grants/NIST-IR-8547-COMPLIANCE.md        # ML-KEM
grep -n "demo shim\|sovereign-primitives" workers/p31-crypto-mcp/src/index.ts

# Phase 1-3 — artefacts exist
ls docs/grants/HUMANITY-AI-LOI.md docs/grants/OTF-CONCEPT-NOTE.md
ls docs/grants/PQC-FUNDER-BRIEF.md docs/grants/SBIR-ELIGIBILITY-MEMO.md
ls docs/grants/NLNET-RESTACK-APPLICATION.md

# The PQC primitives are real (not mocked) — the fundable claim
grep -c "ml_dsa65\|ml_kem768" packages/sovereign-primitives/src/postQuantum.ts   # > 0

# Headers are well-formed on every authored file
node scripts/frontmatter.mjs --check docs/grants

# The whole gate
pnpm gate
```

Expected: the greps return matches, the `ls` lists every file, the primitive
grep is `> 0`, and `pnpm gate` is green **except** for two pre-existing,
unrelated open fix-plans (`sync-component-registry-alias-update`,
`x402-gateway-502-outage`) that the ownership sensor flags once they pass 7
days. Neither is funding work: the first needs unimplemented alias logic in
`scripts/sync-component-registry.mjs`; the second is a live remote Cloudflare
502 (`pnpm mcp:health` → `UNHEALTHY x402-gateway`). Do not "resolve" the outage
by editing the plan — fix the infra. All `docs/grants/` headers and namecheck
are clean.

---

## Common pitfalls

- **Claiming "NIST-compliant" on a mock.** The MCP tools were hardcoded
  (`pqc_verify` always `true`). The primitives are real and tested; the wrapper
  was not. Never let a mock underwrite a compliance claim.
- **Swapping FIPS numbers.** 203=ML-KEM, 204=ML-DSA, 205=SLH-DSA. The NIST doc
  had this wrong in the summary and reused it.
- **Assuming SBIR is open to a 501(c)(3).** It is not. Nonprofit prime =
  disqualified; partner or use nonprofit rails.
- **Treating "Open Internet Stack" as the fund name.** The fund is **Restack**;
  OIS is the initiative. Cite the right one; the eligibility page is the source.
- **Ignoring the Restack AI policy.** "Vibecoding" is ineligible. Human
  authorship must be evident.
- **Applying to OTF FOSS Sustainability before eligibility.** It requires a
  release **3+ years** old with active users. P31 does not qualify yet.
- **Asking OTF for $900K.** The target ceiling is ~$300K; ideal is $50K–$200K
  for 6–12 months.
- **Leading Humanity AI with infrastructure.** The call funds **community-led**
  work in education/labor/arts — not generic AI infrastructure or product
  adoption. Lead with the community, not the stack.
- **A grant narrative with no owner or date.** File artifacts, not intent.
  (`frontmatter.mjs` fails files with malformed headers.)

---

## Decision log

| Decision | Basis |
|---|---|
| 501(c)(3) public-good model, not commercial licensing | Freenet, Benetech, Civitas ID all fund software as mission |
| Grants fund the salary; software stays free | Salary decoupled from users keeps the mission pure |
| Design system = credibility layer, not product | Component layers are commoditized; the fundable goods are crypto/identity/payments/justice/care |
| Donations = values signal, not revenue engine | Pay-what-you-want is the mission; it will not alone fund a salary |
| PQC = highest-urgency asset | $85M/yr NIST authorization, 2026 PQC executive orders, FAR 2030 mandate; Restack lists PQC in scope |
| Humanity AI = nearest deadline & best nonprofit fit | 2026-10-21, US 501(c)(3) eligible, community-led framing |
| OTF = fastest path to a first cheque | rolling, ~6–8 wk decision, nonprofit-eligible |
| Restack = the NGI successor to apply to | 2026-11-03; NGI Taler/Fediversity were the precedent |
| SBIR = partner-gated, not prime | SBIR/STTR exclude 501(c)(3) primes |

---

## Owner + last verified

`Owner: will` · `Last verified: 2026-10-11`

Sources (re-verify before each submission): opentech.fund (IFF, FOSS
Sustainability Fund) · nlnet.nl/restack (guide, eligibility, call 2026-11R) ·
humanityai.ai/open-call · sbir.gov eligibility guide · congress.gov S.3597 (NQI
Reauthorization) · 2026-06-22 PQC executive orders · idtech/biometricupdate
(Civitas ID / Gates).
