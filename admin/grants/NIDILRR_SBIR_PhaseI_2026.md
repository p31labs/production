# P31 Labs — NIDILRR SBIR Phase I Project Narrative (DRAFT)

**Opportunity:** HHS-2027-ACL-NIDILRR-BISA-0308 — NIDILRR Small Business Innovation Research (SBIR) Phase I
**Agency:** Administration for Community Living (ACL), National Institute on Disability, Independent Living, and Rehabilitation Research (NIDILRR)
**Deadline:** December 16, 2026
**Awards:** 11 (Phase I)
**Funding:** $100,000 per award
**Project period:** Six months
**Applicant:** P31 Labs, Inc. — Georgia 501(c)(3) nonprofit
**Draft status:** For human review. **Nothing here is registered or submitted.** Submission is gated on EIN + SAM.gov + Grants.gov registration, performed by a human.

---

> ## ⚠️ WARN — ELIGIBILITY RESEARCH ITEM (HUMAN MUST CONFIRM BEFORE ANY SUBMISSION)
>
> **SBIR statutory eligibility requires a small business that is (a) for-profit, (b) independently owned and operated, (c) ≤ 500 employees, and (d) with the principal researcher employed by the business.** P31 Labs is a Georgia 501(c)(3) **nonprofit** — this is a *prima facie* conflict with the standard SBIR for-profit requirement (13 CFR 121.702).
>
> Before spending any effort on polishing this draft, confirm one of the following paths with counsel and the program office:
>
> 1. **ACL/NIDILRR nonprofit treatment.** The National Institutes of Health and some HHS components have historically permitted nonprofit "applicant organizations" under certain SBIR/STTR structures. Check whether this particular NOFO (HHS-2027-ACL-NIDILRR-BISA-0308) contains a nonprofit carve-out or explicitly requires for-profit status. Read the NOFO's "Eligible Applicants" section verbatim.
> 2. **Structured via a for-profit subsidiary.** If nonprofit treatment is not available, P31 may need to form a for-profit subsidiary (e.g., a Georgia LLC wholly owned by the 501(c)(3)) that meets for-profit small-business criteria, employs the PI, and holds the SBIR award. This has structuring, IP-assignment, and nonprofit-private-inurement (tax) implications — needs legal review before proceeding.
> 3. **Alternative funding vehicle.** If neither path works, consider NIDILRR's non-SBIR field-initiated or RRTC/DRRP mechanisms (some allow nonprofits).
>
> **Do NOT register EIN/SAM.gov/Grants.gov until the human has decided the entity path** — the entity that registers is the entity that must appear in Box on the application. Registering the nonprofit and then applying as a subsidiary would create an identity mismatch that can disqualify the submission.
>
> **Open research items for the human (all confirm-before-submit):**
> - [ ] Read NOFO eligibility section verbatim (nonprofit carve-out?)
> - [ ] Confirm PI-employment requirement (PI must be >50% employed by the small business)
> - [ ] Confirm ≤500-employee threshold applies to the award entity
> - [ ] If subsidiary path: legal opinion on nonprofit control + tax structuring
> - [ ] Resolve device classification discrepancy (see §6 note: compliance record says Class I, device manual says Class II exempt — both cite 21 CFR §890.3710)

---

## 1. Opportunity Summary

NIDILRR's SBIR Phase I supports development of rehabilitation- and assistive-technology innovations. This solicitation (HHS-2027-ACL-NIDILRR-BISA-0308) contemplates up to **11 Phase I awards of $100,000 each** over a **six-month project period**, due **December 16, 2026**. Phase I is intended to establish technical feasibility and commercial viability, with a clear path to Phase II scale-up. This proposal responds to NIDILRR's assistive-technology priorities: functional independence, communication access, and self-direction for people with disabilities.

---

## 2. Problem Statement

Neurodivergent individuals — autistic, ADHD, and related profiles — face daily barriers in three overlapping domains:

1. **Executive function.** Task initiation, working memory, planning, and self-regulation breakdown under cognitive load. Existing tools are medication-adjacent reminders or generic to-do lists that do not adapt to fluctuating capacity.
2. **Sensory regulation.** Digital interfaces designed for neurotypical users drive overwhelm: high visual noise, unpredictable motion, no muting, no pacing. The result is avoidance of the very tools built to help.
3. **Assistive / augmentative communication.** Many users cannot reliably express needs, decisions, or consent in real time — whether from motor-planning deficits (apraxia), speech differences, or shutdown under stress.

Commercially available solutions address these as separate products. None treats the *family* as the unit, none makes the *record of what happened* trustworthy, and none is built on a privacy-first, tamper-evident, post-quantum-secure substrate. Caregivers and clinicians need verifiable evidence of function; users need a system that adapts to their capacity rather than demanding they adapt to it.

---

## 3. Proposed Innovation

**LOOM CareLog — a family-first, tamper-evident executive-function and communication support system, with a privacy-preserving verifiable record that can be shared with caregivers and clinicians on demand.**

LOOM CareLog integrates three mature P31 assets into one coherent Phase I deliverable:

| Asset | Repo / location | Current state | Role in Phase I |
|---|---|---|---|
| **Chat sandbox** | `production/portals/chat/` | Working static React portal; 68/68 tests, WCAG 2.2-conformant, AAF agent manifest | The interaction surface: natural-language assistance, decision support, sensory breaks, communication scaffolding |
| **Tamper-evident event log** | `production/apps/loom/` + `production/packages/canon/` (`loom/hash-chain`, `loom/gate`) | Append-only log with SHA-256 `prev_hash` chain (RFC 8785 canonical preimages), `/api/loom/verify` trust layer, scope-based privacy reads, offline-first design researched | The proof substrate: every interaction is a verifiable event; caregiver/clinician reports are provable, not claimed |
| **PQC-ready crypto layer** | `production/docs (1)/PQC-MIGRATION.md`, `PQC-CREDENTIAL-FORMAT.md`, `packages/sovereign-primitives` | Production-grade triple-signature (Ed25519 + ML-DSA-65 + SLH-DSA-128s), ML-KEM-768 hybrid KEM, live Workers endpoints | Verifiable credentials (care proofs, session records) that remain trustworthy past the quantum horizon |

**What the Phase I deliverable is.** A single deployable assistive-tech product: the chat sandbox's assistive dialogue **writes** to the LOOM tamper-evident log, the PQC layer **seals** log heads and care proofs as verifiable credentials, and a family/caregiver view **reads** a privacy-scoped, court-and-clinician-admissible record. One product, three already-built layers, connected.

**Honest prototype-vs-production statement.** This is a Phase I *feasibility* proposal and we are explicit about maturity:

- **Production-grade today:** the PQC crypto libraries and Workers endpoints (`hybridSign`/`hybridVerify`, triple-signature issuance/verification); the LOOM hash-chain and gate logic (59 unit tests + Playwright e2e, incl. a disk-tamper spec); the canon design tokens (WCAG 2.2 AA, DTCG 2025.10, AAF manifest).
- **Functional prototype today:** the chat sandbox is a working, tested static portal, but it runs on a demo/gamified sandbox with a spoons-based engagement economy — the LUMI-as-agent integration (audit item C1) is deliberately deferred; agent writes into the event log do not yet exist.
- **Not yet production:** the LOOM persistent backend is middleware on the dev server (a live, persistent append-only log) and the static build is a seeded demo. Live multi-family deployment, ECDSA-per-record signatures (the documented gap in LOOM DECISIONS 008), and the offline-first IndexedDB sync are Phase I scope.

That honest split is the Phase I plan: prove the *connections* between the three layers, close the two documented gaps (signatures + agent-writes), and ship a deployable family pilot.

---

## 4. Phase I Objectives and Milestones

**Six months, $100K.** Objectives map to three technical threads plus one evaluation thread.

| # | Objective | Milestone / exit criteria | Month |
|---|---|---|---|
| O1 | **Integrate agent → log.** Chat sandbox assists write approved events to the LOOM append-only log via the canon gate | Closed audit item C1: an agent-proposed event enters the log only through a human-approved gate; e2e covers the arc | 2 |
| O2 | **Close the signature gap.** Add per-record writer signatures (ECDSA P-256 per IETF AAT; composite with ML-DSA-65) to the log | `/api/loom/verify` returns both *what changed* and *who wrote*; tamper spec passes with signatures | 4 |
| O3 | **Seal with PQC.** Log heads and care proofs issued as SD-JWT-compatible verifiable credentials (Ed25519 + ML-DSA-65) | Caregiver- and clinician-facing "receipt" endpoints return verifiable, disclose-what-you-want proofs | 5 |
| O4 | **Family pilot.** Deploy live shared D1 log with Cloudflare Access; run the documented human-test protocol (three identities: child / elder / caregiver) | `FAMILY_PILOT.md` protocol executed; capture sheet with timing rows + verbatim quotes; findings written up | 5–6 |
| O5 | **Commercialization checkpoint.** Assess Phase II path, pricing, and distribution; write commercialization memo | Feasibility report + Phase II plan delivered to NIDILRR | 6 |

**Gatekeeping milestone discipline:** every milestone has a written acceptance criterion tied to the existing test suite — if the e2e contract fails, the feature is wrong, not the test.

---

## 5. Feasibility and Prior Work

P31 has built, tested, and documented the three layers this proposal connects. Feasibility evidence, with concrete artifacts:

- **Tamper-evident log — proven.** `production/apps/loom/` implements a SHA-256 `prev_hash` chain over RFC 8785 canonical preimages (DECISIONS 008), with `/api/loom/verify` that reports exactly where a chain breaks; `e2e/trust-layer.spec.ts` proves a disk tamper breaks the chain. Privacy is enforced at the read path by scope, never by prompt (DECISIONS 012). 59 unit tests + full Playwright e2e contract.
- **PQC layer — proven, production.** `production/docs (1)/PQC-MIGRATION.md` and `PQC-CREDENTIAL-FORMAT.md` document triple-signature credentials (Ed25519 + ML-DSA-65 + SLH-DSA-128s; FIPS 204/205), ML-KEM-768 hybrid KEM (FIPS 203), and live issuance/verification endpoints. Implemented in `packages/sovereign-primitives`.
- **Design system — proven, accessible.** `production/packages/canon/` provides typed tokens, WCAG 2.2 AA contrast (72/72 APCA pass in the chat audit), sensory-aware `muted`/`warmLight` modes, and reduced-motion that collapses duration without disabling state machines (LOOM DECISIONS 004).
- **Chat interaction surface — working prototype.** `production/portals/chat/` is a functioning assistive-chat portal: 68/68 tests, all audit-critical accessibility fixes applied (2026-10-02 audit remediation: theme wiring, ARIA contracts, keyboard operability, AAF manifest). Honest gap: agent integration (C1) is deferred — it is Phase I objective O1.
- **Regulatory posture — documented.** `production/governance/MEDICAL_DEVICE_COMPLIANCE_MANUAL.md` and `production/admin/P31_COMPLIANCE_AND_REPORTS.md` document the quality system (ISO 13485, 21 CFR Part 820 design controls), IEC 62304 software lifecycle, ISO 14971 risk management, and the 21 CFR §890.3710 classification of the powered communication system.

**Feasibility of the *connection* is the Phase I risk, and it is a designed risk:** each layer already has the seam needed — the canon gate was built to accept a writer-per-kind event model, the signature gap is explicitly documented as "the natural next increment" (DECISIONS 008), and the PQC credential endpoints already accept arbitrary claim payloads. The project is an integration and validation project, not a greenfield build.

---

## 6. Key Personnel

**Principal Investigator / Sole employee: William R. Johnson — Founder, P31 Labs, Inc.**
- 16 years safety-critical systems engineering; GS-12 Electrical Engineer, DoD civilian (career defined by engineering, not service)
- Late-diagnosed AuDHD at 39 — the system is built from lived experience, not ethnography
- System Architect authority over the deployed ecosystem; author of the compliance and PQC documentation suite

**Principal-researcher employment note (eligibility-relevant):** the PI is employed by P31 Labs; confirm the >50%-time requirement applies cleanly to whichever entity wins (see WARN block §0).

**Agent infrastructure (engineering capacity multiplier).** P31's development pipeline is a documented agent-assisted system — named architect-authority agents performing design review and verification sign-off (per the compliance record's WCD-06 QA signoff), CI with mandatory test passage, signed commits, and governance audits (`admin/AGENTS.md`, `governance/`). This lets a one-person crew produce the test-and-verification density normally associated with a larger team. For the application, describe this as "an automated, audited engineering pipeline" — be conservative and concrete about what the agents do (code review, verification, documentation) and what only a human does (decision-making, signing, and legal responsibility).

---

## 7. Budget Justification Outline ($100K / 6 months)

Full line-item template in `budget_justification.md` (sibling file). Summary:

- **Personnel** (~$48K) — PI effort + a part-time human-factors/participant-coordination contract
- **Cloud / infrastructure** (~$14K) — Cloudflare Workers, D1, Access; PQC endpoint hosting; observability
- **Equipment** (~$10K) — test devices, sensory/accessibility test hardware, assistive peripherals
- **Participant stipends & testing** (~$8K) — compensated family-pilot participants (IRB-reviewed)
- **Regulatory & legal consultation** (~$6K) — device classification confirmation, privacy/COPPA review
- **Travel / dissemination** (~$4K) — conference + stakeholder engagement
- **Indirect** (~$10K) — negotiated rate or 10% de minimis, whichever applies to the award entity

---

## 8. Commercialization Plan (Draft)

- **Market.** U.S. assistive-technology and executive-function support is a multi-billion-dollar segment with structural gaps: few products are family-first, fewer produce verifiable records, and none is quantum-safe by design. Competing AAC and ADHD-support tools are per-user SaaS with weak trust properties.
- **Revenue model.** Family subscription (household license) with a **clinician/caregiver verifiable-report tier** as the differentiator; institution/SLP licensing for therapy practices and schools; Medicaid-relevant assistive-technology categorization explored in Phase II.
- **Open-source core / proprietary trust layer.** The canon and base log remain open (Apache-2.0, express patent grant). The PQC sealing, multi-family deployment, and clinical report generation are the commercial layer — the same split that protects the nonprofit's public-purpose mission while enabling sustainability.
- **Phase II path.** Scale from one family pilot to a multi-site pilot with clinics and family organizations; close the offline-first sync (Zero-based, already researched in DECISIONS "Open"); pursue a Phase II SBIR and independent distribution.
- **Impact narrative.** NIDILRR funding de-risks the integration and produces a verifiable, accessible assistive technology that improves functional independence — with the evidence layer (tamper-evident, PQC-sealed) as the contribution to the field, not just the product.

---

## 9. Notes on Source Documents and Discrepancies (for the human)

- `docs/PQC-POSITIONING.md` did **not** exist at drafting time; the PQC narrative was grounded in `docs (1)/PQC-MIGRATION.md` and `docs (1)/PQC-CREDENTIAL-FORMAT.md`.
- **Classification discrepancy to resolve:** `admin/P31_COMPLIANCE_AND_REPORTS.md` declares the device **Class I**, 510(k) exempt; `governance/MEDICAL_DEVICE_COMPLIANCE_MANUAL.md` declares **Class II**, 510(k) exempt. Both cite 21 CFR §890.3710. This matters if the grant requires a device-classification statement — confirm the correct classification (or that none is needed for a Phase I software feasibility award) before submission.
- **"Quantum Breath Pacer / 172.35 Hz" and similar language** in the compliance record is biophysics-flavored and should be **omitted or heavily de-jargoned** for a federal grant narrative. Federal reviewers are engineers and clinicians, not fans. Keep the scientific claims conservative: accessible UI, verifiable event log, post-quantum signatures.

---

*Draft for human review. No submission activity performed. Human must complete: (1) eligibility decision per WARN block, (2) EIN + SAM.gov + Grants.gov registration for the award entity, (3) final narrative polish, (4) budget finalization in `budget_justification.md`.*