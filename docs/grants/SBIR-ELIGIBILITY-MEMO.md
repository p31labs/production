<!-- P31-HEADER
id: p31_grant_sbir_eligibility_memo_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# SBIR/STTR Eligibility Memo — P31 Labs (501(c)(3))

**To:** William R. Johnson, operator, P31 Labs, Inc.
**Re:** Can P31 win a NIST SBIR/STTR award for post-quantum cryptography?
**Date:** 2026-10-11

---

## Bottom line

**P31 Labs cannot be an SBIR/STTR prime awardee.** SBIR/STTR awards may only go
to a **for-profit small business concern (SBC)**. A 501(c)(3) is explicitly
ineligible as prime. P31 may participate only as a **subcontractor/sub-grantee**
on an SBIR, or as the **research-institution partner** on an **STTR**. The
federal PQC money is reachable, but **only through a for-profit partner or a
for-profit arm**.

## The rule

- SBIR/STTR eligibility (sbir.gov): the applicant must be a **small business
  concern** — organized **for profit**, ≥51% owned/controlled by US citizens or
  permanent residents, ≤500 employees (agency-dependent).
- A **501(c)(3)** is by definition not organized for profit → **not** an SBC →
  **disqualified as prime**.
- On **STTR**, a nonprofit research institution may be the research partner, but
  a **for-profit SBC must still be the prime**.

NIST SBIR (PQC/identity topics): Phase I ≤ $100K, Phase II ≤ $400K. Program
**reauthorized through 2031-09-30**; NIST reports **no active NOFO** (next
deadline TBD). Note: `sbir.gov` lists a "Cryptography, including Post-quantum
Cryptography" topic with cycle deadlines **2026-11-04, 2027-03-04, 2027-07-07**
(agency TBD — verify the sponsoring agency before pitching).

## Three routes (pick one or run in parallel)

| Route | How it works | P31's role | Effort | Notes |
|---|---|---|---|---|
| **A. Partner with a for-profit SBC** | An eligible SBC is prime; P31 is named subcontractor / subawardee delivering the PQC + identity work | subawardee | medium | Cleanest federal path; needs a willing partner with a matching topic |
| **B. STTR with an SBC + research partner** | SBC prime + research institution; the institution may be P31 if it qualifies | research partner | medium–high | Institution must meet STTR research-institution criteria |
| **C. For-profit arm** | Stand up a for-profit subsidiary ("P31 Technologies, Inc.") that is an SBC | prime (via sub) | high | Must keep the nonprofit mission firewall clean; do **not** route grants/free software through it |

## Recommendation

Pursue **Route A first** — it is the fastest federal-PQC exposure with the least
structural change. In parallel, keep the **nonprofit rails** (Restack, OTF,
Sloan) as primes; they need no partner and P31 is fully eligible. This is the
"fill all the cracks" strategy: nonprofit rails for the mission, a partner rail
for the federal PQC budget.

## Do / Don't

- **Do** cite the real primitives (`sovereign-primitives`) in any partner pitch.
- **Don't** have P31 claim "SBIR-eligible" or sign as applicant.
- **Don't** let a for-profit arm absorb donated/free software; keep the 501(c)(3)
  and the SBC's books and IP story separate.
- **Don't** cite the `p31-crypto-mcp` demo shim as a deliverable.

## Sources (re-verify)

- sbir.gov — "Small Business Eligibility"; STTR research-institution rules.
- sbir.gov — "Cryptography, incl. Post-quantum Cryptography" topic (cycles
  2026-11-04 / 2027-03-04 / 2027-07-07; agency TBD). Reauthorized through 2031.

---

`Owner: will` · `Last verified: 2026-10-11`
