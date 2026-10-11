# P31 Grounding — Citation Ledger

**Purpose:** Every external citation in a governed P31 document is either
verified against a primary source, marked as training-knowledge with a
figure to re-check, or removed. This ledger is the record. An entry that
cannot be verified must not reach an auditor as a claim.

**Generated:** 2026-09-28 · **Audit method:** primary-source fetch (DOI,
registry, .gov, vendor docs) at the time of writing.

---

## Re-verification record (2026-09-29)

All three Tier-A citations below were **re-fetched by direct HTTP fetch in
a later session** and confirmed to resolve to the primary sources described
here. This is not inherited from an earlier claim — the fetches were run
again and returned the cited content.

| # | Citation | Re-fetch URL | Result |
|---|---|---|---|
| 1 | Grammar of Governance | `https://zenodo.org/api/records/21198369` | ✅ 200 — title, author (Allen, Warner Rey), DOI `10.5281/zenodo.21198369`, CRADLE/TEND/KEEP + 98.6% RMF in abstract |
| 2 | ForgeDock #1582 | `https://github.com/RapierCraftStudios/ForgeDock/issues/1582` | ✅ 200 — closed issue, exact title + body, forgeable `FORGE:GATE_PASS` marker |
| 3 | Lilo Engine | `https://www.medrxiv.org/content/10.64898/2026.02.17.26346507v1` | ✅ 200 — preprint page, DOI resolves, abstract confirms 500/500 + "clinical validation is the essential next step" |

No Tier-C entry was re-promoted; VAC / AICDI 3A / Agentic Governance
Benchmark / F.AI.2R remain absent from the repo and uncited.

---

## Tier definitions

| Tier | Meaning | Handling |
|---|---|---|
| **A** | Verified against a primary source (DOI, registry, .gov, vendor page) at audit time | Keep citation as-is |
| **B** | Real, well-established standard/framework; figure-level nuance should be re-checked at source before an auditor reads it | Keep, note re-check |
| **C** | Could not verify a primary source; or appears nowhere in the repo | Remove from any doc that reaches an auditor; do not cite |

---

## Verified citations (Tier A)

### 1. The Grammar of Governance — CRADLE/TEND/KEEP modes

- **Cited in:** `packages/govern/domains/family/constitution.json:8` ("Built from The Grammar of Governance (CRADLE mode)")
- **Primary source:** Zenodo record 21198369 — "The Grammar of Governance", Warner Rey Allen, published 2026-07-05. DOI `10.5281/zenodo.21198369`.
- **Verified claim:** The abstract states: *"The preservation chain calibrates governance sensitivity to the vulnerability of the person in the room: CRADLE for children, TEND for elders, KEEP for operational environments."* Also confirms REGISTER/BALANCE/CONFIRM/RELEASE/REPORT and a three-state confirmation gate with a held state.
- **Also verified:** the paper's "NIST AI RMF 1.0 — 71 of 72 subcategories (98.6% coverage)" figure appears verbatim in the abstract.
- **Status:** ✅ KEEP

### 2. ForgeDock gate-marker forgeability precedent (#1582)

- **Cited in:** `packages/govern/docs/DECISIONS.md:33` ("The ForgeDock precedent (issue #1582): a gate that reads a path from a file the PR can write is forgeable")
- **Primary source:** https://github.com/RapierCraftStudios/ForgeDock/issues/1582 — "fix(ci): gate-marker-check FORGE:GATE_PASS is forgeable — no author check (staging review — PR #1575)". Closed, merged.
- **Verified claim:** The issue confirms a `<!-- FORGE:GATE_PASS -->` marker scanned from PR comments is forgeable by any commenter; the fix restricts the scan to the trusted review identity / requires a signed or run-id-bound marker.
- **Status:** ✅ KEEP

### 3. Lilo Engine — deterministic safety pipeline for elder AI

- **Cited in:** `packages/govern/domains/family/constitution.json:89` ("The Lilo Engine's 100% crisis recall is bench-battery-scoped, not clinical")
- **Primary source:** medRxiv preprint 2026.02.17.26346507 — "A deterministic safety pipeline for therapeutic AI in elderly assisted living", Aejaz Sheriff. DOI `10.64898/2026.02.17.26346507`.
- **Verified claim:** The abstract reports a 5-layer deterministic pipeline replacing a multi-agent orchestrator, "100% crisis recall (500/500 comprehensive scenarios), < 5% false positive rate", AND the honest boundary: *"the 100% crisis recall claim is validated against the semantic and linguistic crisis expressions within our test battery, not against the full clinical phenotype space."*
- **Status:** ✅ KEEP — the constitution's "bench-battery-scoped, not clinical" framing matches the primary source exactly.

### 4. FIPS 203 (ML-KEM) — post-quantum key encapsulation

- **Cited in:** `packages/govern/domains/family/constitution.json:92` ("ML-KEM-768 + ML-DSA-65 (FIPS 203/204) hybrid")
- **Primary source:** NIST FIPS 203 — "Module-Lattice-Based Key-Encapsulation Mechanism Standard", published 2024-08-13. DOI `10.6028/NIST.FIPS.203`. Parameter sets ML-KEM-512/768/1024 confirmed in the abstract.
- **Status:** ✅ KEEP

### 5. SchemaVer — schema semantic versioning

- **Cited in:** `packages/govern/docs/DECISIONS.md:5,18` (MODEL-REVISION-ADDITION versioning for the schema URI bump)
- **Primary source:** Snowplow — "Introducing SchemaVer for semantic versioning of schemas" (snowplow.io). Also used by CERT CC (SSVC) per its ADR-0015.
- **Verified claim:** MODEL-REVISION-ADDITION, where ADDITION = additive, backward-compatible change. Matches DECISIONS.md R1's use.
- **Status:** ✅ KEEP

### 6. ISO/IEC 42001:2023 — AI management systems

- **Cited in:** `packages/govern/docs/COMPLIANCE.md:33`, `packages/govern/specs/compliance.md:18` ("certifiable AIMS")
- **Primary source:** ISO/IEC 42001:2023, published December 2023 — the first certifiable international AI management system standard. Confirmed via iso.org and multiple references.
- **Status:** ✅ KEEP

### 7. NIST AI Risk Management Framework 1.0

- **Cited in:** `packages/govern/docs/COMPLIANCE.md:24`, `packages/govern/specs/compliance.md:9`
- **Primary source:** NIST AI 100-1 (AI RMF 1.0). Real, well-established framework.
- **Status:** ✅ KEEP (Tier B re-check: no numeric coverage claim is made in the P31 docs beyond the Grammar of Governance paper's own 98.6% figure, which is verified above)

### 8. EU AI Act

- **Cited in:** `packages/govern/docs/COMPLIANCE.md:41`, `packages/govern/specs/compliance.md:26` (Art 13/14/15 mapping)
- **Primary source:** Regulation (EU) 2024/1689. Real, in force.
- **Status:** ✅ KEEP (Tier B re-check: Article numbers are stable; verify against the consolidated text before an auditor reads the mapping)

---

## Real but figure-level re-check needed (Tier B)

These are real, well-established frameworks/standards. The P31 docs do not
make numeric claims about them, so no removal is required — but any future
numeric claim must cite the primary source.

| Item | Where | Re-check |
|---|---|---|
| JSON Schema versioning | DECISIONS.md:5,18 | Standard is JSON Schema; SchemaVer is the project-specific scheme (verified above) |
| SHA-256 chain / dual-signature length guards (Ed25519, ML-DSA-65) | justice constitution + runbooks | Algorithm names and length guards are local implementation facts, not external citations; ML-DSA is FIPS 204 (verified) |

---

## Could not verify / absent from repo (Tier C — do not cite)

The following appeared in conversation narrative only. A repo-wide search
confirmed they exist in **no** file in either repo:

- **"VAC paper"** — no results for "VAC paper" AI governance (DuckDuckGo). Not on disk. Do not cite.
- **"AICDI 3A model"** — GitHub search returns only unrelated repos (form generators, templates); no matching 3A model. Not on disk. Do not cite.
- **"Agentic Governance Benchmark"** — GitHub repo search: 0 results. Not on disk. Do not cite.
- **"F.AI.2R"** — no verifiable source found (code search requires auth; no repo match). Not on disk. Do not cite.

**Handling:** no on-disk doc references these, so no doc edit is required.
This ledger is the permanent record that they were considered and dropped.

---

## The honesty invariant

An entry in this ledger is either:
- **Tier A** — a primary source exists and was fetched at audit time, or
- **Tier B** — a real standard with figure-level re-check noted, or
- **Tier C** — absent from the repo and must never be cited.

Any future document that cites an external source must add its claim to this
ledger in the same commit, or the citation does not ship.

**Verification commands run at audit time:**

```bash
# Grammar of Governance
curl -s "https://zenodo.org/api/records?q=%22Grammar%20of%20Governance%22" | jq '.hits.hits[].metadata.title'
# ForgeDock #1582
# fetch https://github.com/RapierCraftStudios/ForgeDock/issues/1582
# Lilo Engine
# fetch https://www.medrxiv.org/content/10.64898/2026.02.17.26346507v1
# FIPS 203
# fetch https://csrc.nist.gov/pubs/fips/203/final
```

---

## Agent-governance citations (2026-10-11, fetched at audit time)

Added for the agent-governance crosswalk / provenance / grant deliverables.
Every entry below was re-fetched by direct HTTP fetch this session. The one
correction to the working brief is recorded in the first row.

| # | Citation | Re-fetch URL | Result |
|---|---|---|---|
| 1 | Accountability paper — **DOI `10.5281/zenodo.21387487`** (NOT `.21387488`) | `https://zenodo.org/api/records/21387487` | ✅ 200 — title "Implementing Agentic-AI Accountability: A Minimal, From-Scratch Reference Stack Mapped to the IMDA MGF, EU AI Act, NIST, and ISO/IEC 42001"; Verma (Adsit.Work), 2026-07-16; five principles **Provenance, Contemporaneity, Reproducibility, Disclosure, Independence** verbatim in abstract; 0.47 ms/append, 4.0 MB/1000, <0.1 ms chain overhead; self-assessed "D3 artifact" |
| 2 | Accountability software — **concept DOI `10.5281/zenodo.21387488`** | `https://zenodo.org/api/records/21403580` | ✅ 200 — "incident-ledger" v1.1.0 (the *software*, not the paper); checkpoint/Merkle layer (RFC 6962) added in 1.1.0 |
| 3 | SCITT AI Agent Execution Profile | `https://datatracker.ietf.org/doc/draft-emirdag-scitt-ai-agent-execution/` | ✅ 200 — `draft-emirdag-scitt-ai-agent-execution-00` (individual I-D, Pinar Emirdag / VERIDIC Inc., 2026-04-11, **expires 2026-10-15**); AIR (AgentInteractionRecord) COSE_Sign1, ES256, chain_hash = SHA-256(content_hash ‖ prev_chain_hash ‖ action_timestamp_ms ‖ agent_id), 4-step verification, EU AI Act Art 12/19 mapping, ML-DSA named as future PQC candidate |
| 4 | WCA (Warrant Certificate Authorities) | `https://datatracker.ietf.org/doc/draft-bondar-wca/` | ✅ 200 — `draft-bondar-wca-00` (individual I-D, Roman Bondar, 2026-03-01, **expired & archived 2026-09-02**); "semantic laundering", Warrant Attestation Levels WAL-0..3, reference-monitor properties |
| 5 | Humanity AI — Communities Leading on AI open call | `https://humanityai.ai/open-call` | ✅ 200 — deadline **2026-10-21 4:59 PM PT / 7:59 PM ET**; $10M total, tiers $75K–$150K / $150K–$500K / $500K–$1M; lead must be U.S. 501(c)(3); **issue areas: Education · Labor & economy · Humanities/arts/culture** (no "healthcare" area); approaches: (1) shape how AI is governed/used, (2) build AI on community terms, (3) challenge AI; out of scope: AI literacy, AI adoption, research-only; open-weight/open-source prioritized |

**Tier assignments for the crosswalk:** rows 1–5 are **Tier A** (primary source
fetched). The SCITT draft and WCA draft are individual Internet-Drafts with no
IETF standing (per their own boilerplate) — cited as "work in progress", not as
normative standard. WCA is additionally **expired**; cite as historical, not
active.

**Correction carried into the docs:** the accountability paper is
`10.5281/zenodo.21387487`; `10.5281/zenodo.21387488` is the *incident-ledger
software* concept DOI. Do not cite `.21387488` as the paper.

---

## Agent-governance citations — second pass (2026-10-11, fetched at audit time)

Added after the second research pass. All re-fetched this session.

| # | Citation | Re-fetch URL | Result |
|---|---|---|---|
| 6 | **RFC 9943** — SCITT architecture | `https://datatracker.ietf.org/doc/rfc9943/` | ✅ 200 — **Proposed Standard (June 2026)**; "An Architecture for Trustworthy and Transparent Digital Supply Chains" (was `draft-ietf-scitt-architecture`). This is the strongest citation available: a real RFC, not an individual draft. |
| 7 | Agent Action Capsule Profile | `https://datatracker.ietf.org/doc/draft-mih-scitt-agent-action-capsule/` | ✅ 200 — `draft-mih-scitt-agent-action-capsule-05` (S. Mih / Action State Group, 2026-09-26, expires 2027-03-30). Abstract verbatim: *"A Capsule is recorded on every verdict, including refusals: a blocked or denied Capsule is the auditor-grade evidence that a gate worked."* JCS (RFC 8785) digests, Ed25519 COSE envelopes. Active (revision -05). |
| 8 | OMP Domain Profile — EU AI Act Art. 12 | `https://datatracker.ietf.org/doc/draft-veridom-omp-euaia/` | ✅ 200 — `draft-veridom-omp-euaia-00` (Adebayo / Apalowo / Makanjuola, latest 2026-04-03, **expired & archived**). Names a **three-layer integrity architecture: SHA-256, RFC 3161, institution signature**. Cite as historical. |
| 9 | OAgents behavioral envelope | `https://zenodo.org/api/records/19425021` | ✅ 200 — "OAgents: A Behavioral Envelope Standard … An Implementation Profile of the NIST AI Risk Management Framework (AI RMF 1.0)" (Longmire, 2026-04-05, `10.5281/zenodo.19425021`). 26 components, 7 categories, 3 conformance levels; **pre-execution gates + post-execution verification**. |

**Tier assignments:** #6 (RFC 9943) and #9 (OAgents) are **Tier A**. #7
(capsule profile) is **Tier A** but is an individual Internet-Draft (no IETF
standing) — cite as "work in progress". #8 (OMP) is **Tier A / expired** — cite
as historical, not active.

**Carried into the docs:** the capsule profile (`-05`) is now the primary SCITT
anchor for the negative-controls claim ("a blocked Capsule is the evidence a
gate worked"); RFC 9943 upgrades "SCITT" from draft to Proposed Standard; the
OMP profile names the RFC 3161 + institution-signature gap P31's ledger has not
yet closed.

---

## Agent-governance citations — third pass (2026-10-11, fetched at audit time)

Added after the grant-reframe pass. All re-fetched this session.

| # | Citation | Re-fetch URL | Result |
|---|---|---|---|
| 10 | **RFC 9942** — COSE Receipts | `https://datatracker.ietf.org/doc/rfc9942/` | ✅ 200 — **Proposed Standard (June 2026)**; signed Merkle inclusion/consistency proofs; `RFC9162_SHA256` VDS. P31's checkpoints (`lib/ledger.mjs:72-80`) are RFC 9162-shaped but not issued as COSE Receipts. |
| 11 | AgentROA | `https://datatracker.ietf.org/doc/draft-nivalto-agentroa-route-authorization/` | ✅ 200 — `draft-nivalto-agentroa-route-authorization-01` (J. Michalak / Nivalto, 2026-04-16, **expires 2026-10-16**); ROA envelope + ARA per-hop receipt + AER execution receipt; enforcement at a separate process boundary, receipts produced on PERMIT *and* DENY. |
| 12 | Fending — MCP accountability measurement | `https://zenodo.org/api/records?q=%22Measuring Agent Governance Posture%22` | ✅ 200 — `10.5281/zenodo.20972251` (Fending / Ordovera Advisory, 2026-06-27); 945 servers / 17,563 population; **71% exhibit ≥1 gap (95% CI 67.6–74.0%); 81% authenticate but only 17% attribute actions to a principal; 20% remote-only opaque**. Dataset: `10.5281/zenodo.20970604`. |
| 13 | Capsule OTel Correlation Extension | `https://datatracker.ietf.org/doc/draft-palanisamy-scitt-aac-otel/` | ✅ 200 — `draft-palanisamy-scitt-aac-otel-00` (Palanisamy + Mih, 2026-10-02, expires 2027-04-05); `org.agentactioncapsule.otel` block carrying trace/span correlation with digest-only tiers. |

**Tier assignments:** #10 and #12 are **Tier A**. #11 and #13 are **Tier A** but
individual Internet-Drafts (no IETF standing) — cite as "work in progress".
The EMILIA ↔ Capsule seam is GitHub prior work (`emilia-protocol/examples/scitt/
capsule-seam-vector.mjs`), not a numbered standard — cited as prior art, not
normative.

**Carried into the docs:** Fending's 71%/17% numbers are now the empirical need
statement in the crosswalk, the evidence doc, and the grant angle; RFC 9942 and
AgentROA are added to the crosswalk standards table; the OTel extension is
named as a gap (P31 does not yet emit trace/span correlation).