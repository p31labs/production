# QMSR Draft Artifact Starter Templates — DHF / DMR / RMF / CAPA

> **STATUS: NOT YET APPLIED — counsel review required**
> These are **empty starter templates** (headers + required-content checklists with placeholder fields). They are NOT filled-in legal, engineering, or quality documents, and they do NOT satisfy any FDA or ISO record requirement until populated, reviewed, approved, and registered. Populate, approve, and index under the document-control register (see `QMSR-COMPLIANCE-GAP.md` § 4.2).

- **Draft date:** 2026-10-02
- **Reference standard:** 21 CFR Part 820 (QMSR) incorporating **ISO 13485:2016** by reference; ISO 14971:2019; IEC 62304:2006
- **Related finding:** Audit G-D3 — artifacts required by `MEDICAL_DEVICE_COMPLIANCE_MANUAL.md` do not yet exist.

---

# Template 1 — Design History File (DHF)

**Doc number:** P31-QMS-010-___
**Device / project:** [Device name, e.g., Phenix Navigator]
**Revision:** [x.x]
**Owner:** [Design Lead]
**Status:** [DRAFT / IN REVIEW / APPROVED]
**Date:** [YYYY-MM-DD]

### 1. Purpose
State the purpose of the DHF: to contain records demonstrating that the design meets its input requirements and was developed per ISO 13485:2016 § 7.3.10.

### 2. Design & Development Plan (ISO 13485:2016 § 7.3.1)
- [ ] Design and development stages
- [ ] Review, verification, validation, and transfer activities
- [ ] Responsibilities and authorities
- [ ] Interface management between participating groups
- [ ] Risk management activities (link to RMF)
- [ ] Regulatory requirements (21 CFR 820 QMSR; IEC 62304; applicable 510(k)-exemption conditions per § 890.9)

### 3. Design Inputs (ISO 13485:2016 § 7.3.2)
- [ ] User needs and intended use
- [ ] Functional, performance, and safety requirements
- [ ] Applicable regulatory and standard requirements
- [ ] Risk-management-derived requirements (from RMF)
- [ ] Input review/approval record; unresolved/incomplete inputs disposition

### 4. Design Outputs (ISO 13485:2016 § 7.3.3)
- [ ] Outputs that allow verification against inputs
- [ ] Outputs providing a basis for the Device Master Record / Medical Device File (ISO 13485:2016 § 4.2.3)
- [ ] Hardware specs, software specs, BOM, drawings, labeling
- [ ] Output review/approval record

### 5. Design Reviews (ISO 13485:2016 § 7.3.4)
- [ ] Review at planned stages with documented participants
- [ ] Review findings and actions
- [ ] Records retained

### 6. Design Verification (ISO 13485:2016 § 7.3.5)
- [ ] Verification protocol(s)
- [ ] Verification report(s) — objective evidence that outputs meet inputs
- [ ] Disposition of non-conforming results

### 7. Design Validation (ISO 13485:2016 § 7.3.6)
- [ ] Validation protocol(s)
- [ ] Validation report(s) on initial production units or equivalents, representative of actual use
- [ ] Usability / clinical evaluation records
- [ ] Residual risk acceptability confirmation

### 8. Design Transfer (ISO 13485:2016 § 7.3.8)
- [ ] Transfer records to production
- [ ] Manufacturing process / scale-up verification
- [ ] Production qualification results

### 9. Design Changes (ISO 13485:2016 § 7.3.9)
- [ ] Change documentation (review, verification/validation as appropriate, approval before implementation)
- [ ] Traceability to affected DHF/DMR records

### 10. Approvals
- [ ] Design Lead signature/date
- [ ] QA signature/date
- [ ] Management Representative signature/date

---

# Template 2 — Device Master Record (DMR) / Medical Device File

**Doc number:** P31-QMS-020-___
**Device / project:** [Device name]
**Revision:** [x.x]
**Owner:** [Document Control Manager]
**Status:** [DRAFT / IN REVIEW / APPROVED]
**Date:** [YYYY-MM-DD]

> Mapping: ISO 13485:2016 § 4.2.3 (Medical device file). Retained "DMR" as internal label per manual § 9.2.

### 1. Device Specifications
- [ ] Device description and intended use
- [ ] Performance specifications
- [ ] Hardware and software specifications
- [ ] Configuration / architecture documents

### 2. Bill of Materials (BOM)
- [ ] Full component list with part numbers
- [ ] Suppliers and alternative sources
- [ ] Component specifications / datasheets references

### 3. Software Documentation
- [ ] Software design documents (IEC 62304)
- [ ] Software requirements traceability
- [ ] Software configuration / release records

### 4. Labeling and Packaging
- [ ] Labels (device, packaging)
- [ ] Instructions for Use (IFU)
- [ ] Warnings / safety information
- [ ] Packaging specifications

### 5. Quality Assurance Procedures
- [ ] Production and process control procedures
- [ ] Incoming / in-process / final acceptance criteria
- [ ] Test methods and measurement specifications
- [ ] Equipment calibration/maintenance references

### 6. Acceptance Records Cross-Reference
- [ ] Link to DHR / production and traceability records (ISO 13485:2016 § 7.5.1, § 7.5.8, § 7.5.9)

### 7. Document Control
- [ ] DMR index and location of constituent documents
- [ ] Revision control and approval record

---

# Template 3 — Risk Management File (RMF)

**Doc number:** P31-QMS-030-___
**Device / project:** [Device name]
**Revision:** [x.x]
**Owner:** [Risk Management Lead]
**Status:** [DRAFT / IN REVIEW / APPROVED]
**Date:** [YYYY-MM-DD]
**Standard:** ISO 14971:2019, applied within ISO 13485:2016 product realization (clause 7.1)

### 1. Risk Management Plan
- [ ] Scope of the RMF (device, systems, accessories)
- [ ] Responsibilities and authority
- [ ] Risk acceptability criteria
- [ ] Review activities and frequency
- [ ] Lifecycle phases covered (design, production, post-production)

### 2. Risk Analysis
- [ ] Intended use and reasonably foreseeable misuse
- [ ] Hazard identification (e.g., electrical, software, mechanical, usability, cybersecurity)
- [ ] Risk estimation — severity and probability (link to manual § 6.2)
- [ ] FMEA / FTA records as applicable

### 3. Risk Evaluation
- [ ] Risk acceptability decisions
- [ ] Unacceptable risks identified for control

### 4. Risk Control
- [ ] Control measures (inherent safety by design, protective measures, safety information)
- [ ] Verification of risk control effectiveness
- [ ] Residual risk evaluation
- [ ] Risk/benefit analysis

### 5. Risk Management Review
- [ ] Overall residual risk acceptability determination
- [ ] Review record signed by Management Representative

### 6. Post-Production Risk Management
- [ ] Post-market surveillance data feed
- [ ] Complaint trend analysis (link to CAPA)
- [ ] RMF update log

---

# Template 4 — CAPA Record

**Doc number:** P31-QMS-040-___
**Trigger type:** [Non-conformance / Complaint / Internal audit finding / External audit finding / Risk file update / Other]
**Source reference:** [NCR#, complaint #, audit #, RMF item]
**Originator / Date:** [Name] / [YYYY-MM-DD]
**Owner (CAPA lead):** [Name]
**Status:** [OPEN / INVESTIGATING / ACTION PLANNED / IMPLEMENTED / VERIFIED / CLOSED]
**Standard:** 21 CFR § 820.45; ISO 13485:2016 § 8.5.2 (corrective) / § 8.5.3 (preventive)

### 1. Problem Description
- [ ] Statement of the non-conformity / nonconforming product or process
- [ ] Extent and impact (quantity, distribution, severity)
- [ ] Immediate containment/correction taken

### 2. Investigation & Root Cause Analysis
- [ ] Investigation plan and scope
- [ ] Root cause analysis method (5-Why, fishbone, fault tree, etc.)
- [ ] Root cause statement
- [ ] Impact assessment on device safety and effectiveness

### 3. Corrective / Preventive Action
- [ ] Corrective action(s) to eliminate root cause
- [ ] Preventive action(s) to prevent occurrence
- [ ] Implementation timeline and resource requirements
- [ ] Person(s) responsible

### 4. Effectiveness Verification
- [ ] Verification method (follow-up audit, metric monitoring, re-test)
- [ ] Verification results
- [ ] Evidence of effectiveness retained
- [ ] Residual risk / RMF update if applicable

### 5. Closure
- [ ] Review and approval of closure by QA
- [ ] Management Representative sign-off
- [ ] Records retained per retention schedule (manual § 9.5 / ISO 13485:2016 § 4.2.5)

---

**Companion documents:** `QMSR-COMPLIANCE-GAP.md` (gap analysis, section-mapping table, document-control register). Do not populate, approve, or rely on these templates until counsel review of the QMSR patch is complete.

**STATUS: NOT YET APPLIED — counsel review required**