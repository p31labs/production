# QMSR Compliance Gap Analysis & Patch Companion

> **STATUS: NOT YET APPLIED — counsel review required**
> This document is a **draft companion** to `MEDICAL_DEVICE_COMPLIANCE_MANUAL.md` (P31-MDCM-001, v1.0.0). It is not in force. Nothing in this file amends, supersedes, or modifies the manual. Apply only after FDA/Georgia counsel review and board approval, per the governance change-control process.

- **Draft date:** 2026-10-02
- **Draft author:** Agent (draft for human + counsel review)
- **Applies to:** `governance/MEDICAL_DEVICE_COMPLIANCE_MANUAL.md` (read-only; not modified)
- **Trigger:** FDA Quality Management System Regulation (QMSR), effective **February 2, 2026**, amends 21 CFR Part 820 and incorporates **ISO 13485:2016** by reference. QSIT inspection guide retired; compliance is now evaluated under Compliance Program **CP 7382.850**.
- **Related finding:** Audit finding **G-D3** (`AUDIT-GOVERNANCE.md`) — the manual requires DHF/DMR/RMF/CAPA artifacts that do not exist. QMSR makes the underlying records (management reviews, internal audits, supplier audit reports) directly inspectable, raising G-D3's urgency from documentation hygiene to inspection exposure.

---

## 1. What QMSR changes

1. **ISO 13485:2016 incorporated by reference.** New 21 CFR § 820.5 makes ISO 13485:2016 the operative QMS standard. The old QSR's granular, codified subparts (820.30 design controls, 820.40 document controls, 820.50 purchasing, 820.100 CAPA, 820.180 record keeping, 820.181 DMR, 820.184 DHR, etc.) were revoked and replaced by a short regulation that references ISO 13485:2016 clauses. *Counsel to confirm the exact scope of the incorporation (in its entirety vs. any express exceptions stated in the final rule's incorporation-by-reference language).*
2. **Management reviews are now inspectable.** ISO 13485:2016 § 5.6 (Management review) requires documented management review records. Under QMSR/CP 7382.850 these records are subject to inspection. The old QSR-era practice of withholding management review, internal audit, and supplier audit records (previously shielded under the old § 820.180(c) record-keeping confidentiality carve-outs) is no longer available — those carve-outs were revoked with the old regulation's record-keeping structure. *Counsel to confirm the precise superseded subsection citation.*
3. **Internal audit records are now inspectable.** ISO 13485:2016 § 8.2.2 requires documented internal audit programs, audit reports, and audit records. These must be maintained and made available.
4. **Supplier audit reports are now inspectable.** ISO 13485:2016 § 7.4.1 (Purchasing process) requires documented supplier evaluation and re-evaluation; audit reports and evaluation criteria must be retained and available.
5. **CAPA expectations.** ISO 13485:2016 § 8.5.2 (Corrective action) and § 8.5.3 (Preventive action) require documented CAPA with root-cause investigation and **effectiveness verification** — corresponding to new 21 CFR § 820.45. Records of CAPA initiation, investigation, action, and effectiveness verification must exist and be retained.
6. **DMR/DHR terminology replaced.** Old § 820.181 (Device Master Record) and § 820.184 (Device History Record) were deleted. ISO 13485:2016 § 4.2.3 (Medical device file) is the functional successor to the DMR; production/traceability records live under ISO 13485:2016 § 7.5.1, § 7.5.8, § 7.5.9. The company may retain "DMR/DHR" labels as internal document names, but the gap doc maps them to their ISO equivalents.
7. **Inspection program changed.** QSIT is retired; FDA inspects under **CP 7382.850**, which weights ISO 13485:2016 conformity, management review, internal audit, supplier controls, CAPA, and records availability.

---

## 2. Citation mapping: manual (old QSR / 21 CFR 820) → QMSR / ISO 13485:2016

| Manual section | Current citation (old QSR) | QMSR / ISO 13485:2016 equivalent | Note |
|---|---|---|---|
| § 1.4 Regulatory References | 21 CFR Part 820 (QSR) | 21 CFR Part 820 (QMSR, ISO 13485:2016 by reference) | Rewrite reference list; cite ISO 13485:2016 as incorporated per § 820.5 |
| § 2.3 Key Regulatory Requirements — Design Controls | 21 CFR 820.30 | ISO 13485:2016 § 7.3 (Design and development) | Remap; § 820.30 revoked |
| § 2.3 — Document Controls | 21 CFR 820.40 | ISO 13485:2016 § 4.2.4 (Control of documents) | Remap; § 820.40 revoked |
| § 2.3 — Record Keeping | 21 CFR 820.180 | ISO 13485:2016 § 4.2.1 / § 4.2.5 (Control of records); new § 820.40/820.45 record requirements | Remove § 820.180 cite; record carve-outs gone |
| § 3.1 Quality Policy | 21 CFR 820.20(a) | ISO 13485:2016 § 5.3 (Quality policy) | Align wording |
| § 3.3 Organizational Structure / QMR | — | ISO 13485:2016 § 5.5.2 (Management representative) + § 4.1.1 | Add management representative designation |
| § 3.4 Document Control System | 21 CFR 820.40 | ISO 13485:2016 § 4.2.4 | Align to ISO document-control elements |
| § 3.5 Record Keeping Requirements | 21 CFR 820.180 + manual retention | ISO 13485:2016 § 4.2.5 (retention) + § 7.3.10 | Retention periods need counsel review (see § 4, item 3.5) |
| § 5 Design and Development Controls | 21 CFR 820.30 | ISO 13485:2016 § 7.3 (7.3.1–7.3.10) | Add design transfer (7.3.8), design change (7.3.9), design & development file (7.3.10) |
| § 6 Risk Management | ISO 14971:2019 | ISO 13485:2016 § 7.1 (product-realization planning incorporating risk); new § 820.30 | ISO 14971 retained; tie risk into product-realization planning |
| § 9.1 DHF | (implicit under 820.30) | ISO 13485:2016 § 7.3.10 (Design and development file) | DHF artifacts still required; rename/re-index as design & development file |
| § 9.2 DMR | 21 CFR 820.181 (revoked) | ISO 13485:2016 § 4.2.3 (Medical device file) | Rename concept to medical device file |
| § 9.3 DHR | 21 CFR 820.184 (revoked) | ISO 13485:2016 § 7.5.1 / § 7.5.8 / § 7.5.9 | Production + identification + traceability records |
| § 9.4 RMF | ISO 14971 + 820.30 | ISO 13485:2016 § 7.1, § 8.5.2/8.5.3 | Retain; add risk file linkage to CAPA |
| § 11.1 Internal Audit | 21 CFR 820.22 | ISO 13485:2016 § 8.2.2 | Records now inspectable |
| § 11.2 FDA Inspection Prep | QSIT | CP 7382.850 | Update inspection-prep language |
| § 11.3 Supplier Audit | 21 CFR 820.50 | ISO 13485:2016 § 7.4.1 / § 7.4.3 | Supplier audit reports now inspectable |
| § 12 CAPA | 21 CFR 820.100 | New 21 CFR § 820.45; ISO 13485:2016 § 8.5.2 / § 8.5.3 | Add effectiveness-verification record requirement |
| § 13 Post-Market Surveillance | 21 CFR 820.198 (complaint files) | ISO 13485:2016 § 8.2.1 (Feedback) + § 8.4 (Analysis of data); 21 CFR Part 803 (MDR) unchanged | ISO feedback + data-analysis clauses |
| § 2.1 / § 4.1 Classification | 21 CFR § 890.3710, Class II, 510(k) exempt | **Unchanged** by QMSR | Classification regs unaffected; but see § 5 (G-P2 interaction) |
| § 14 Appendix A Regulatory References | Old 21 CFR 820 | Updated 21 CFR 820 (QMSR) + ISO 13485:2016 | Refresh reference appendix |
| § 14 Appendix B Document Templates | Old template list | Add DHF/DMR/RMF/CAPA templates (see `QMSR-DHFS.md`) | Reference new starter templates |

---

## 3. What the existing manual must change — line-by-line patch proposal for counsel

> Each item cites the manual's section (and TOC line anchors). Apply as a single revision (v1.1.0) with approval record.

1. **§ 1.4 Regulatory References** — Replace "21 CFR Part 820 (Quality System Regulation)" with "21 CFR Part 820 (Quality Management System Regulation, incorporating **ISO 13485:2016** by reference per § 820.5)". Keep ISO 13485:2016, ISO 14971:2019, IEC 62304:2006 entries; add CP 7382.850.
2. **§ 2.3 Key Regulatory Requirements** — Delete the stale trio "Design Controls: 21 CFR Part 820.30 / Document Controls: 21 CFR Part 820.40 / Record Keeping: 21 CFR Part 820.180". Replace with: "Quality Management System: 21 CFR § 820.5 incorporating **ISO 13485:2016**; Design & Development: ISO 13485:2016 § 7.3; Document Control: ISO 13485:2016 § 4.2.4; Records: ISO 13485:2016 § 4.2.5; Corrective Action: 21 CFR § 820.45."
3. **§ 3.3 Organizational Structure** — Designate a "Management Representative" per ISO 13485:2016 § 5.5.2 (may be the QMR). Add management-review participation.
4. **§ 3.4 Document Control System** — Align bullet list to ISO 13485:2016 § 4.2.4 (approval, review/update, revision status, availability, legibility, external document control).
5. **§ 3.5 Record Keeping Requirements** — Retain the DHF/DMR/RMF retention schedule only as **company policy**, not as an FDA-imposed period. ISO 13485:2016 § 4.2.5 requires retention for at least the lifetime of the medical device or per applicable regulations; the manual's "2 years after device discontinuance" figures need counsel review and, at minimum, a justification note. (No QMSR § 820.180 equivalent exists.)
6. **§ 5.1 Design and Development Planning** — Add ISO 13485:2016 § 7.3.1 alignment and risk-management input; note design output must "provide a basis for the medical device file" (§ 4.2.3).
7. **§ 5.3 Design Output Specifications / Documentation Requirements** — Reframe "Device Master Records (DMR)" as "Device Master Record / Medical Device File (ISO 13485:2016 § 4.2.3)".
8. **§ 5.6 Design Validation** — Add explicit "design transfer to production" record per ISO 13485:2016 § 7.3.8 and design-change control per § 7.3.9 (changes require documented review, verification/validation as appropriate, and approval before implementation).
9. **§ 6 Risk Management** — Add sentence: "Risk management activities form part of product-realization planning per ISO 13485:2016 § 7.1; the Risk Management File is a required artifact and must be linked to CAPA records (ISO 13485:2016 § 8.5.2/8.5.3)."
10. **§ 9.1 DHF** — Add mapping note to ISO 13485:2016 § 7.3.10; state that the Design History File must be indexed and retrievable (see G-D3 remediation, § 4 below).
11. **§ 9.2 DMR** — Add mapping note to ISO 13485:2016 § 4.2.3 (Medical device file); keep the DMR content list.
12. **§ 9.3 DHR** — Add mapping note to ISO 13485:2016 § 7.5.1/§ 7.5.8/§ 7.5.9; note production/traceability records must be retained and are inspectable.
13. **§ 9.5 Document Retention Schedule** — Flag "2 years after device discontinuance" figures for counsel review (see item 5). Keep RMF at 10 years only as policy; ISO 14971/ISO 13485 do not fix it.
14. **§ 11.1 Internal Audit Program** — Add: audit records (plan, checklists, reports, findings, follow-up) must be retained per ISO 13485:2016 § 8.2.2 and are **subject to FDA inspection** under CP 7382.850.
15. **§ 11.2 FDA Inspection Preparation** — Replace QSIT-era readiness language with **CP 7382.850** compliance-program language; add "management review records, internal audit records, and supplier audit reports available at inspection."
16. **§ 11.3 Supplier Audit Program** — Add: supplier evaluation criteria, audit reports, and re-evaluation records retained per ISO 13485:2016 § 7.4.1 and **subject to FDA inspection**.
17. **§ 12 CAPA** — Align with 21 CFR § 820.45 and ISO 13485:2016 § 8.5.2/§ 8.5.3; add mandatory "effectiveness verification" record step; add that CAPA records are inspectable.
18. **§ 13 Post-Market Surveillance** — Add ISO 13485:2016 § 8.2.1 (Feedback) and § 8.4 (Analysis of data) citations; note complaint-file obligations under 21 CFR Part 803 are unchanged.
19. **§ 14 Appendix A** — Refresh regulatory references per item 1; add "FDA Compliance Program CP 7382.850."
20. **§ 14 Appendix B** — Add "DHF / DMR / RMF / CAPA Starter Templates — see `governance/templates/QMSR-DHFS.md`."
21. **NEW: Management Review section** — The manual has no management-review section. Add one (per ISO 13485:2016 § 5.6): review inputs (internal/external audit results, feedback, complaints, CAPA status, process/product conformity), review outputs (decisions/actions), frequency, participants, and record retention. This is the single largest new requirement triggered by QMSR inspectability.

---

## 4. G-D3 remediation plan (QMS artifacts + document control)

**Background (from `AUDIT-GOVERNANCE.md`, G-D3):** the manual requires DHF/DMR/RMF/CAPA but no QMS artifacts exist. Under QMSR these artifacts' records are now directly inspectable. Remediation = create the artifacts below and register them.

### 4.1 Artifacts to create

| Artifact | Required content (starter template) | Owner |
|---|---|---|
| **DHF** (Design & Development File, ISO 13485:2016 § 7.3.10) | Design plan/schedule; design inputs; design outputs; design reviews; verification protocols + reports; validation protocols + reports; design transfer; design changes | Design lead |
| **DMR / Medical Device File** (ISO 13485:2016 § 4.2.3) | Device specifications; BOM; software documentation; labeling/packaging; QA procedures; acceptance criteria/test methods | Document control |
| **RMF** (ISO 14971:2019, ISO 13485:2016 § 7.1) | Risk management plan; hazard identification; risk analysis (FMEA); risk evaluation; risk control measures; verification of risk reduction; residual-risk acceptability; post-production risk review | Risk lead |
| **CAPA record** (21 CFR § 820.45; ISO 13485:2016 § 8.5.2/8.5.3) | Non-conformance / complaint trigger; investigation + root-cause analysis; impact assessment; corrective + preventive actions; implementation timeline; **effectiveness verification** | QA |
| **Management review record** (ISO 13485:2016 § 5.6) | Agenda/inputs, attendance, decisions/actions, outputs, follow-up; retained | QMR |
| **Internal audit record** (ISO 13485:2016 § 8.2.2) | Audit plan, checklists, report, findings, CAPA linkage | QA |
| **Supplier audit file** (ISO 13485:2016 § 7.4.1) | Supplier evaluation criteria, audit reports, re-evaluation schedule | Purchasing/QA |

### 4.2 Document-control register (suggested starting structure)

> Mirrors the manual's § 3.4 document-control intent and addresses audit finding G-P4 (governance/admin untracked in git). Create in `governance/` once counsel approves.

| Doc no. | Title | Rev | Owner | Status | Location | Last review |
|---|---|---|---|---|---|---|
| P31-MDCM-001 | Medical Device Compliance Manual | 1.0 | QMR | APPROVED | governance/ | 2026-03-24 |
| P31-QMS-001 | QMSR Compliance Gap Analysis & Patch | 0.1 | QMR | **DRAFT — NOT APPLIED** | governance/templates/ | 2026-10-02 |
| P31-QMS-002 | DHF Starter Template | 0.1 | Design lead | DRAFT | governance/templates/ | 2026-10-02 |
| P31-QMS-010 | Design History File (index + artifacts) | — | Design lead | TO CREATE | [to assign] | — |
| P31-QMS-020 | Device Master Record / Medical Device File | — | Document control | TO CREATE | [to assign] | — |
| P31-QMS-030 | Risk Management File | — | Risk lead | TO CREATE | [to assign] | — |
| P31-QMS-040 | CAPA record set | — | QA | TO CREATE | [to assign] | — |
| P31-QMS-050 | Management Review records | — | QMR | TO CREATE | [to assign] | — |
| P31-QMS-060 | Internal Audit program records | — | QA | TO CREATE | [to assign] | — |
| P31-QMS-070 | Supplier Audit file | — | Purchasing/QA | TO CREATE | [to assign] | — |

Register rules: every artifact gets a doc number, a named owner, revision control, approval date, and a retention period. Add to git (addresses G-P4) so version-in-force is provable.

---

## 5. G-P2 interaction (Class I vs Class II) — review classifications together

- `governance/MEDICAL_DEVICE_COMPLIANCE_MANUAL.md` (and the verified eCFR/FDA data) classify the device **Class II**, product code **ILQ** (Powered Communication System), 510(k)-exempt under 21 CFR § 890.3710 subject to § 890.9.
- `admin/P31_COMPLIANCE_AND_REPORTS.md` + WCD clinical docs classify it **Class I** — the audit (G-P2) flags this contradiction; the admin record is the one that would face FDA/court.
- **QMSR interaction:** QMSR/ISO 13485:2016 apply to **both** classes, so the QMS gap is class-independent. But classification drives: 510(k)-exemption maintenance (§ 890.9 limitations), general vs. special controls, MDR/reporting obligations (21 CFR Part 803), registration/listing, and labeling. A "Class I" claim for a device that eCFR classifies Class II is an affirmative misrepresentation that would compound any QMS deficiency at inspection.
- **Recommended:** review § 2.1 and § 4.1–4.4 of the manual **together** with `admin/P31_COMPLIANCE_AND_REPORTS.md` §1 as one classification decision, and correct the admin/WCD records to Class II (audit recommended-fix order item 2). Do not finalize the QMSR patch until this is resolved, since the manual's classification sections will be re-issued in the same revision.

---

## 6. References

- 21 CFR Part 820 (amended by QMSR; effective February 2, 2026) — esp. § 820.5, § 820.20, § 820.25, § 820.30, § 820.40, § 820.45
- ISO 13485:2016, *Medical devices — Quality management systems — Requirements for regulatory purposes* (incorporated by reference)
- ISO 14971:2019, *Medical devices — Application of risk management to medical devices*
- IEC 62304:2006, *Medical device software — Software life cycle processes*
- 21 CFR § 890.3710 — Powered Communication Systems (Class II, 510(k)-exempt; unchanged by QMSR)
- FDA Compliance Program CP 7382.850 (replaces QSIT)
- `AUDIT-GOVERNANCE.md` findings G-D3, G-P2, G-P4

---

**Document control (companion draft):** Document no. P31-QMS-001 · Revision 0.1 (draft) · Author: agent draft · **STATUS: NOT YET APPLIED — counsel review required**