<!-- P31-HEADER
id: p31_grant_humanity_ai_agent_governance_20261011_v1.0
type: research
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Humanity AI — Agent-Governance Angle

**Applicant:** P31 Labs, Inc. (Georgia Domestic Nonprofit; EIN 42-1888158; 501(c)(3))
**Programme:** Humanity AI — Communities Leading on AI
**Deadline:** 2026-10-21, 4:59 PM PT / 7:59 PM ET (verified at `humanityai.ai/open-call`)
**Award range:** $75,000–$1,000,000, up to 3 years (tiers $75–150K / $150–500K / $500K–$1M)

---

## 1. The angle in one paragraph

The world is drafting standards for AI agents. P31 already has a working
implementation — 11 governance gates, a hash-chained provenance ledger, and
composite post-quantum approval tokens — **and a negative-control suite that
automates the independent verification the standards assume**. We are asking
Humanity AI to fund the layer that lets neurodivergent people and family
caregivers *govern the AI that mediates their care*: every care action the AI
proposes is signed, chained, and legible in plain language to a non-technical
caregiver.

---

## 2. Fit to the call (verified against the open-call text)

The call funds community-led work in three issue areas through three
approaches. P31's governance work is anchored to **"Shaping how AI is governed
and used"** and **"Building AI on community terms"**, with the household as the
community. Care does not appear as a named issue area; it threads through the
two that apply:

| Call dimension | P31 mapping |
|---|---|
| **Issue area: Labor & economy** | Unpaid care *is* work. Caregivers whose labor the AI mediates need the same accountability a worker organizing around enforceable standards asks for. |
| **Issue area: Education** | A caregiver's day is a curriculum. A signed, legible audit trail of what the AI did is a *learning scaffold* — the household learns to govern by reading the trail. |
| **Approach: Shape how AI is governed and used** | The governance stack *is* the guardrail: fail-closed gates, signed approvals, a chain no one edits unnoticed. |
| **Approach: Build AI on community terms** | The 11 gates + hash-chained ledger are exactly the **"audit approaches that ensure AI systems work as intended"** the call names; free and open-source (no paywall); the community holds the governance, not a vendor. |
| **Out of scope (compliant)** | Not AI-literacy (we build, not teach), not AI-adoption (we do not deploy a vendor model), not research-only (working code + a seated community council). |
| **Priority: open-weight/open-source** | Everything P31 ships is open; no closed-model dependency is required for the governance layer. |

The community-led claim is concrete: a **Community Advisory Council** of
neurodivergent adults and caregivers holds decision rights over what the AI may
never do. The grant pays for that participation, not just engineering.

**Vision for Community Leadership** — the review criterion that decides this
call — is satisfied on its own terms: the caregivers *define the goals and
shape the approach*. They decide what the AI may never do; the governance
stack is the machinery that makes their decisions binding. The community is not
consulted; it governs.

**The need is measurable.** A study of 945 MCP servers (Fending,
`10.5281/zenodo.20972251`) found 71% exhibit at least one accountability gap,
and — the decisive number — 81% authenticate callers while only 17% attribute
logged actions to a specific principal (the "enforcement-audit gap"). P31's
stack is in the 17%: every consequential action is signed by a named human
principal and hash-chained. That is the gap this grant closes for the people
whose care the AI mediates.

---

## 3. The fundable asset: P31's governance stack

The evidence that "we implement the standard you are drafting":

- **11 governance gates**, each mapped to the five principles of accountable
  agents and four regimes — `docs/specs/agent-governance-crosswalk.md`.
- **A hash-chained provenance ledger** — SHA-256 over RFC 8785 JCS, Merkle
  checkpoints, `verify-chain.mjs` walks from genesis and exits 1 on tamper —
  `docs/specs/provenance-ledger.md`.
- **Negative controls as standing verification** — 11 governance gates proven
  fail-able, each with a planted violation asserted to be caught —
  `docs/specs/negative-controls-evidence.md`.
- **Legible to a caregiver** — the same record rendered in plain language —
  `docs/specs/caregiver-audit-example.md`.

### 3.1 The standards are converging on exactly this

| Standard | P31's counterpart |
|---|---|
| **RFC 9943** (SCITT, Proposed Standard) | hash-chained append-only ledger + `verify-chain`; the SCITT architecture P31's ledger instantiates |
| **RFC 9942** (COSE Receipts, Proposed Standard) | P31's Merkle checkpoints (every 100 entries, `lib/ledger.mjs:72-80`) are RFC 9162-shaped; RFC 9942 is the receipt format a SCITT Transparency Service would issue over them |
| **Agent Action Capsule Profile** (`draft-mih-scitt-agent-action-capsule-05`) | its central claim is P31's law: *"a blocked or denied Capsule is the auditor-grade evidence that a gate worked"* — P31's `negative-controls.mjs` plants violations and asserts the gate blocks them |
| SCITT AI Agent Execution Profile (`draft-emirdag-scitt-ai-agent-execution-00`) | hash chain + verify walk; composite Ed25519 + ML-DSA-65 tokens where the draft still mandates ES256 and names ML-DSA a *future* candidate |
| **OAgents** (`10.5281/zenodo.19425021`, NIST AI RMF 1.0 profile) | the same "behavioral envelope": pre-execution gates (`veto-check`, `token-check`) + post-execution verification (`verify-chain`, `audit-*`) |
| EU AI Act Art. 12 (tamper-resistant automatic logging) | append-only ledger, tamper detectable and localizable |
| ISO/IEC 42001 Annex A.6.2.8 (tamper-evident event logs) | ledger + retention tags + `audit-policy` gate |
| IMDA MGF (tiered autonomy, human accountability) | fail-closed default; high-severity actions require a signed human token |

### 3.1a Post-quantum signatures are converging on P31's exact choice

Four independent 2026 drafts arrive at the same composite signature P31 already
ships: **Ed25519 + ML-DSA-65** (logical AND). The OpenA2A Agent Identity
Protocol (AIP) carries a hybrid Ed25519 + ML-DSA-65 signature; the AIGA draft
requires both to pass; the Agent PKI (APKI) draft proposes a classical + ML-DSA-65
composite. `lib/token.mjs:107-122` verifies exactly that (Ed25519 always,
ML-DSA-65 when present, both must hold). This is the "we implement what the
standards are still drafting" claim, and it costs P31 nothing to say — the code
already exists.

### 3.2 The one finding the whole angle rests on

*Implementing Agentic-AI Accountability* (`10.5281/zenodo.21387487`) measures
the cost of accountability and reaches the finding that P31's grant narrative
turns on: **the technical levels are cheap; the expensive step is the standing
independent verification — which the paper itself did not take (it self-assesses
as a D3 artifact).** P31's `negative-controls.mjs` is that verification,
automated and re-runnable by any party. That is the contribution, and the ask.

The timing is now undeniable: Mysten Labs and Google Cloud shipped a commercial
"Verifiable Agent Arbiter" in October 2026 for exactly this job. P31's
differentiator is not that the gap exists — it is that P31's version is
**open-source, automated, and legible to a caregiver**, which no commercial
arbiter ships.

---

## 4. What the grant funds

| Year | Deliverable | Community outcome |
|---|---|---|
| **Year 1** | Seated Community Advisory Council; 25 pilot households; governance layer wired to the care companion | Caregivers read the audit trail; the AI cannot act without a signed approval |
| **Year 2** | Close the negative-control coverage cells (14 open); stand up an **independent verification runner** — the SCITT "Evidence Custodian" role no single-machine ledger supplies | Published governance charter; a party distinct from P31 runs the suite |
| **Year 3** *(if awarded)* | Open toolkit adopted by peer caregiver groups | Other communities govern their AI with the same stack |

---

## 5. The ask, stated plainly

> Fund us to finish the one step the accountability paper could not take: a
> standing, independent verification that the gates work — for the people whose
> care the AI mediates. The gates are the evidence. The chain is the guarantee.
> The caregiver is the reader.

---

## 6. Budget (matches `HUMANITY-AI-LOI.md` — $250,000 / 24 months)

| Line | Category | Amount | Notes |
|---|---|---|---|
| Community Advisory Council stipends | $30,000 | 8 members, paid participation; decision rights | matches "community-led" criterion |
| Operator / lead salary | $120,000 | Founder-operator | salary decoupled from users |
| Engineering (governance + provenance) | $60,000 | close negative-control cells + independent runner | the technical layer, already partially built |
| Pilot support (25 households) | $15,000 | devices, connectivity, accessibility | the community that holds the governance |
| Independent security & accessibility review | $18,000 | third-party, published | the "independence" principle made organizational |
| Fiscal / administrative (≤10%) | $7,000 | indirect | |
| **Total** | **$250,000** | | |

---

## 7. Citations (verified 2026-10-11, logged in `docs/grounding/CITATION_LEDGER.md`)

- Accountability paper — `10.5281/zenodo.21387487` (note: the software concept
  DOI is `.21387488`; do not cite it as the paper).
- SCITT AI Agent Execution Profile — `draft-emirdag-scitt-ai-agent-execution-00`
  (individual I-D, expires 2026-10-15).
- WCA — `draft-bondar-wca-00` (expired & archived; cite as historical).
- Agent Action Capsule Profile — `draft-mih-scitt-agent-action-capsule-05`.
- MCP accountability measurement — Fending, `10.5281/zenodo.20972251`.
- Humanity AI open call — `humanityai.ai/open-call` (deadline, tiers, issue
  areas, approaches, exclusions).

---

`Owner: will` · `Verified: 2026-10-11` · Companion to `HUMANITY-AI-LOI.md`;
this file is the governance-specific angle that LOI §3 ("Agent governance")
expands into.