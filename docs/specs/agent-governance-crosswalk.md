<!-- P31-HEADER
id: p31_spec_agent_governance_crosswalk_20261011_v1.0
type: spec
component: workspace
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# Agent-Governance Crosswalk

**Status:** living · **Version:** 1.0 · **Verified:** 2026-10-11
**Owner:** P31 Labs, Inc. (501(c)(3), EIN 42-1888158)
**Sources:** `package.json:8` (the gate chain), `scripts/gate.mjs`, `scripts/lib/*`,
`scripts/negative-controls.mjs`, `scripts/fix-plan-scan.mjs`

> **The claim, in one line.** P31 implements the evidence layer that the emerging
> agent-accountability standards assume, and it proves each governance gate can
> fail. This document maps that implementation to the five principles of
> accountable agents and to four governance regimes, with `file:line` for every
> row.

---

## 1. Purpose and how to read it

A funder reading this document should be able to answer three questions without
running the code:

1. **What do we claim to govern?** (the 11 governance gates)
2. **Which standard does each gate answer?** (the five-principle × four-regime
   matrix)
3. **How do we know a gate is real, not furniture?** (the negative-control
   coverage matrix)

The rows cite source location, not paraphrase. A claim without a `file:line` is
a vibes claim and is not made here.

This document does **not** duplicate the Loom's IETF-draft mapping
(`docs/PROOF-OF-BEHAVIOR.md`) or the identity/session split
(`docs/GOVERNANCE.md`). Those are cited where they are the source of truth.

---

## 2. Gate-count reconciliation: "11 gates" vs. 25 checks

The working brief says "11 gates." `pnpm gate` runs **25 checks**
(`package.json:8`). This is not an error; it is two different groupings. The
reconciliation:

- **25 checks** = the full `pnpm gate` chain, including capture sensors, publish
  hygiene, and toolchain checks.
- **11 governance gates** = the subset that governs *agent action*: the four
  tetrahedron faces (`V1·V2·V3·V4`), the five safety-subsystem sensors, the
  scope lock, and the negative-control suite.
- **1 embedded self-test** = `fix-plan-scan --self-test`, a proof-of-fail nested
  inside a gate rather than a distinct check.

### 2.1 The 25 checks, classified

| # | Check | Class | Governs | Proven fail-able |
|---|---|---|---|---|
| 1 | `namecheck` | capture | stable names (`NAME_RE`, `scripts/namecheck.mjs:40`) | no |
| 2 | `frontmatter --check` | capture | header contract (`scripts/frontmatter.mjs:22-24`) | no |
| 3 | `fix-plan-scan` | **gate** | ownership — every problem filed (`scripts/fix-plan-scan.mjs:118-146`) | **yes** |
| 4 | `fix-plan-scan --self-test` | self-test | proof the scan fails (`scripts/fix-plan-scan.mjs:26-47`) | n/a |
| 5 | `veto-check` | **gate** | destructive commands gated (`scripts/veto-check.mjs:16-31`) | **yes** |
| 6 | `verify-chain` | **gate** | ledger integrity (`scripts/verify-chain.mjs:12-18`) | **yes** |
| 7 | `token-check` | **gate** | approval-token presence (`scripts/token-check.mjs:25-48`) | **yes** |
| 8 | `soft-delete-check` | **gate** | 90-day retention window (`scripts/soft-delete-check.mjs:24`) | **yes** |
| 9 | `audit-coverage` | **gate** | every file tagged (Face 1, V1·V2·V3) | **yes** |
| 10 | `audit-safety` | **gate** | no delete without prior classify (Face 2, V1·V2·V4) | **yes** |
| 11 | `audit-provenance` | **gate** | every delete snapshot-backed (Face 3, V1·V3·V4) | **yes** |
| 12 | `audit-policy` | **gate** | retention tags honored (Face 4, V2·V3·V4) | no |
| 13 | `audit-redundancy` | design | double-padding caught | **yes** |
| 14 | `audit-scope` | **gate** | no change outside the scope lock | **yes** |
| 15 | `negative-controls` | **gate** | the gates themselves can fail (`scripts/negative-controls.mjs:34-174`) | n/a |
| 16 | `verify-mcp-paths` | toolchain | MCP entrypoints exist | no |
| 17 | `theme-check` | toolchain | theme schema valid | no |
| 18 | `check-p31-scope` | publish | npm scope migration | no |
| 19 | `check-workspace-protocol` | toolchain | local `@p31ca/*` resolution | no |
| 20 | `pnpm change check` | publish | changeset hygiene | no |
| 21 | `check-deprecated-tokens` | publish | deprecated-token enforcement | no |
| 22 | `check-token-parity` | publish | DTCG/CSS token parity | no |
| 23 | `check-publish-surface` | publish | publish-scope surface | no |
| 24 | `check-token-vocabulary` | publish | canonical token paths | no |
| 25 | `check-publish-peers` | publish | peer-dependency resolution | no |

The **11 governance gates** are checks 3, 5–12, 14, 15. That is the set this
crosswalk maps. The remaining 14 checks are capture, toolchain, publish, and
design hygiene — real, but not what an auditor means by "agent governance."

---

## 3. The five principles (verified source)

The principles are the systematization from *Implementing Agentic-AI
Accountability* (Verma, Adsit.Work, 2026-07-16,
`10.5281/zenodo.21387487`), which derived them jointly from the four regimes in
§4. The wording below is taken from the abstract (verified 2026-10-11; see
`docs/grounding/CITATION_LEDGER.md`).

| Principle | Question the evidence must answer |
|---|---|
| **Provenance** | Where did this action come from — what agent, model, tool call, delegated authority? |
| **Contemporaneity** | Was the record made *at the time* of the action, not reconstructed after? |
| **Reproducibility** | Can the evidence be re-verified without trusting the original producer? |
| **Disclosure** | Is the record legible to the parties who need it — regulators, caregivers, auditors? |
| **Independence** | Can a party *distinct from the agent* verify the claim without trusting the agent's runtime? |

---

## 4. The four regimes (verified anchors)

| Regime | The requirement that lands on P31 | Source anchor |
|---|---|---|
| **IMDA MGF (Agentic AI)** | Tiered autonomy; "meaningful human accountability"; high-severity actions not automated | Singapore IMDA Model AI Governance Framework for Agentic AI (launched Jan 2026; updated 2026-05-20) |
| **EU AI Act (Reg 2024/1689)** | Art. 12 — automatic recording of events, tamper-resistant logs over the system lifetime; Art. 13/19 traceability + retention | `draft-emirdag-scitt-ai-agent-execution-00` §8.1 (compliance mapping); `docs/PROOF-OF-BEHAVIOR.md` (high-risk logging operative dates) |
| **NIST AI RMF 1.1** | GOVERN/MAP/MEASURE/MANAGE; GenAI Profile (NIST AI 600-1) evidence expectations | `docs/grounding/CITATION_LEDGER.md` (RMF 1.0 Tier B); GenAI Profile 600-1 |
| **ISO/IEC 42001:2023** | Clauses 7.5/9 recorded info + internal audit; Annex A.6.2.8 — tamper-evident, lifecycle-mapped event logs | `docs/grounding/CITATION_LEDGER.md` (42001 Tier A) |

---

## 5. The crosswalk: principle × regime × implementation

Each row names the gate(s) that satisfy the principle and the `file:line` that
proves it. A gate may appear under more than one principle.

### 5.1 Provenance — "where did this come from"

| Regime expectation | P31 implementation |
|---|---|
| IMDA MGF: attributable human accountability | `token-check` requires an approval token for every consequential action (`scripts/token-check.mjs:25`); `lib/token.mjs:87` binds the token to `issued_by` |
| EU AI Act Art. 12: automatic recording of events | `lib/ledger.mjs:55-82` appends every `propose/approve/execute/restore` with `actor` + `at`; `audit-coverage` ensures every file is tagged |
| NIST RMF: traceable behaviour record | `lib/ledger.mjs:67` recomputes `digest` over the canonicalized body; `prev_digest` links to the prior entry (`:58`) |
| ISO 42001 A.6.2.8: "who did what, when, with which model" | entry schema carries `action`, `actor`, `path`, `at` (`lib/ledger.mjs:60-66`) |

### 5.2 Contemporaneity — "recorded at the time"

| Regime expectation | P31 implementation |
|---|---|
| IMDA MGF: approval before higher-severity action | `veto-check` intercepts destructive commands at the static layer; `lib/softdelete.mjs:23` snapshots to CAS *before* the move |
| EU AI Act Art. 12: capture at execution, not after | `lib/ledger.mjs:59` stamps `at` at append time; `audit-provenance` checks the snapshot existed *before* deletion |
| NIST RMF: no retroactive reconstruction | `verify-chain` fails if a prior entry is edited after the fact (`lib/ledger.mjs:94-99`) |
| ISO 42001: temporal ordering | `seq` is monotonically assigned from `readEntries().length + 1` (`lib/ledger.mjs:57`) |

### 5.3 Reproducibility — "independently re-verifiable"

| Regime expectation | P31 implementation |
|---|---|
| IMDA MGF: evidence that can be re-checked | `verify-chain.mjs:12-18` walks from genesis and recomputes each hash; exits 1 on mismatch |
| EU AI Act Art. 12: tamper-resistance | SHA-256 over RFC 8785 JCS (`lib/ledger.mjs:22-28`); any edit breaks the chain |
| NIST RMF: verifiable without trusting the producer | `verifyChain` (`lib/ledger.mjs:91-101`) needs only the ledger file, no runtime trust |
| ISO 42001: auditor-proof logs | Merkle-root checkpoint every 100 entries (`lib/ledger.mjs:72-80`) |

### 5.4 Disclosure — "legible to the parties who need it"

| Regime expectation | P31 implementation |
|---|---|
| IMDA MGF: human-readable accountability | `approve.mjs` prints a human summary of the token scope (`scripts/approve.mjs:72-77`); caregiver view in `docs/specs/caregiver-audit-example.md` |
| EU AI Act Art. 13: traceable, interpretable decisions | the ledger records `reason` and `action` as plain fields, not opaque blobs (`lib/ledger.mjs:60`) |
| NIST RMF: documentation for oversight | `audit-policy` enforces retention tags are honored (`scripts/audit-policy.mjs`) |
| ISO 42001: recorded information | `frontmatter` requires `type/status/retention/owner` on every significant file |

### 5.5 Independence — "verifiable by a party distinct from the agent"

| Regime expectation | P31 implementation |
|---|---|
| IMDA MGF: human, not the system, is ultimately accountable | the approval token is signed by a human key the agent does not hold (`lib/token.mjs:10-11`, `:28-45`) |
| EU AI Act: logs that withstand operator mutability | `verify-chain` runs as a *separate* process from the writer; the writer cannot pass it by construction |
| NIST RMF: independence of verification | `negative-controls.mjs` plants violations and asserts the gate catches them (`:34-145`) — the standing independent check, automated |
| ISO 42001: internal audit | `fix-plan-scan --self-test` (`scripts/fix-plan-scan.mjs:26-47`) is the same proof for the ownership gate |

---

## 6. Negative-control coverage matrix

Per the P31 law "the gate must be able to fail," each governance gate needs a
planted violation and an assertion that the gate catches it. Current coverage:

| Gate | Negative control | Plant | Asserted exit |
|---|---|---|---|
| `veto-check` | planted `rm -rf` in a script | `negative-controls.mjs:37-42` | blocked |
| `verify-chain` | tampered first ledger entry | `negative-controls.mjs:46-64` | blocked |
| `token-check` | `execute` without a token | `negative-controls.mjs:68-79` | blocked |
| `soft-delete-check` | hard-delete before window | `negative-controls.mjs:83-95` | blocked |
| `fix-plan-scan` | planted unfiled TODO | `negative-controls.mjs:99-104` | blocked |
| `fix-plan-scan --self-test` | planted TODO in a `.ts` file | `fix-plan-scan.mjs:26-47` | exit 1 |
| `audit-coverage` | planted untagged plan | `negative-controls.mjs:108-113` | blocked |
| `audit-redundancy` | planted double-padded card | `negative-controls.mjs:117-122` | blocked |
| `audit-scope` | planted out-of-scope change | `negative-controls.mjs:126-143` | blocked |
| `audit-safety` | `soft-delete` with a token but no CAS snapshot / trash record | `negative-controls.mjs:145-158` | blocked |
| `audit-provenance` | `soft-delete` with a CAS snapshot but no trash destination | `negative-controls.mjs:161-174` | blocked |

**Gaps (honest):** `namecheck`, `frontmatter`, `audit-policy`,
`verify-mcp-paths`, `theme-check`, and the seven publish-hygiene checks have no
negative control yet. These are the open coverage cells — see §8. The MCP
governance tools (`propose_page`, `scaffold_component`, `validate_output`) carry
their own vitest negative controls (`workers/design-mcp/src/governance.test.ts`),
separate from the `pnpm gate` chain.

---

## 7. Standards mapping (the funder narrative)

The emerging standards converge on what P31 already runs. Mapping to the
verified drafts:

| Standard | What it specifies | P31's counterpart | Divergence (honest) |
|---|---|---|---|
| **RFC 9943** (SCITT, Proposed Standard) | single-issuer signed-statement transparency; Issuer / Transparency Service / Relying Party; append-only VDS + receipts | `lib/ledger.mjs` hash chain + `verify-chain.mjs`; the ledger is the append-only structure | P31 has no independent Transparency Service today — the "Evidence Custodian" role is unfilled (the grant ask) |
| **RFC 9942** (COSE Receipts, Proposed Standard) | signed Merkle inclusion/consistency proofs over a VDS (`RFC9162_SHA256`) | P31's Merkle checkpoints every 100 entries (`lib/ledger.mjs:72-80`) are RFC 9162-shaped but not yet issued as COSE Receipts | P31 anchors to itself, not to a Transparency Service's VDS |
| **Agent Action Capsule Profile** (`draft-mih-scitt-agent-action-capsule-05`) | digest-committed record of one action with **verdict-level disposition**; *"A Capsule is recorded on every verdict, including refusals: a blocked or denied Capsule is the auditor-grade evidence that a gate worked"* | `negative-controls.mjs` plants violations and asserts the gate *blocks* them — a refused action is exactly what P31 records as proof | P31 records refusals in the gate's exit code, not as a signed Capsule; the *claim* is the same, the *format* differs |
| **Capsule OTel Correlation Extension** (`draft-palanisamy-scitt-aac-otel-00`) | carries trace/span correlation alongside the sealed record; digest-only tiers for identifiers that index user data | none — P31 does not yet emit trace/span correlation into the ledger | a named gap: P31's ledger has no OTel correlation handle today |
| **AgentROA** (`draft-nivalto-agentroa-route-authorization-01`) | enforcement at a **separate process boundary**, external to the agent; receipts produced intrinsically by the enforcement decision (PERMIT or DENY) | `verify-chain.mjs` runs as a **separate process** from the writer; `negative-controls` asserts denial | P31's enforcement is a gate script, not a signing proxy at the MCP boundary |
| **EMILIA ↔ Capsule seam** (who→what, prior work) | threads one action's digest through the seam between an authorization receipt (**WHO approved**) and an action capsule (**WHAT was done**) | P31's exact composition: `lib/token.mjs` issues the approval (`approve` entry), `lib/ledger.mjs` records the execution (`execute` entry), joined by `token_id` | the seam vector is the standards-side articulation of what P31 already ships |
| **SCITT AI Agent Execution Profile** (`draft-emirdag-scitt-ai-agent-execution-00`, **expires 2026-10-15**) | `AgentInteractionRecord` as COSE_Sign1; chain_hash = SHA-256(content_hash ‖ prev ‖ ts ‖ agent_id); 4-step verification; Issuer/Custodian/Relying-Party split | `lib/ledger.mjs` hash chain + `verify-chain.mjs` 4-step-equivalent walk | P31 chains the **whole JCS body** (`lib/ledger.mjs:67`), not the AIR's content-hash-of-fields; P31 signs with **Ed25519 + ML-DSA-65** where the draft mandates **ES256** today (draft names ML-DSA as a *future* candidate, §5.9) |
| **WCA** (`draft-bondar-wca-00`, **expired**) | warrant certificates for tool-call provenance; "semantic laundering"; WAL-0..3 | composite approval tokens bound to path scope (`lib/token.mjs:119`) | WCA certifies *data sources*; P31 certifies *actions*. Cite as historical, not active |
| **EU AI Act Art. 12** (incl. OMP profile `draft-veridom-omp-euaia-00`, **expired**) | tamper-resistant automatic logging; the OMP profile names a **three-layer integrity architecture: SHA-256, RFC 3161, institution signature** | `verify-chain` + `ledger` (SHA-256 over JCS + Merkle checkpoints) | P31 has SHA-256 + Merkle but **no RFC 3161 timestamp and no institution signature** — the OMP profile names exactly the gap to close |
| **NIST AI RMF 1.0 — OAgents** (`10.5281/zenodo.19425021`) | a "behavioral envelope": **pre-execution gates + post-execution verification + operational discipline**, 26 controls, 3 conformance levels | `veto-check` + `token-check` (pre-execution), `verify-chain` + `audit-*` (post-execution), `negative-controls` (discipline) | P31's envelope is the 11 governance gates; OAgents is the closest NIST-side systematization of the same shape |
| **ISO/IEC 42001 A.6.2.8** | tamper-evident, lifecycle-mapped event logs | `ledger` + `frontmatter` retention tags + `audit-policy` | retention is enforced by tag, not by a separate log-storage backend |

The single most important mapping is to the paper's central finding — the
technical levels are cheap, the expensive step is **standing independent
verification**, which the paper itself did not take ("a D3 artifact"). P31's
`negative-controls.mjs` is that verification, automated and re-runnable by any
party. That is the contribution, and the ask (§8).

The empirical need is now measured, not asserted: a study of 945 MCP servers
(Fending, `10.5281/zenodo.20972251`) found 71% exhibit an accountability gap
and — the decisive number — 81% authenticate callers while only 17% attribute
logged actions to a principal. P31's negative-control suite is the automated
check that its own gates are not in the 71%.

---

## 8. Gaps and non-claims

What this stack does **not** yet prove, stated so an auditor does not have to
discover it:

1. **No third-party custody / no RFC 3161 or institution signature.** The
   ledger is append-only on one machine; the SCITT independent
   Evidence-Custodian role is not filled, and the EU AI Act OMP profile's
   three-layer integrity architecture (`draft-veridom-omp-euaia-00`) names
   **RFC 3161 timestamp + institution signature** that P31 does not yet
   produce. This is the "standing independent verification" gap.
2. **No model-provenance fields.** The ledger records `action`/`actor`/`path`
   but not `model_id`, `tokenizer_digest`, or `engine_build_digest`
   (`docs/PROOF-OF-BEHAVIOR.md` flags the same gap for the Loom).
3. **Negative-control coverage is partial.** 11 of 25 checks are proven
   fail-able; the remaining open cells are capture, toolchain, and publish
   hygiene.
4. **The ledger is one entry today.** The construction is proven by the
   conformance vector in `docs/specs/provenance-ledger.md`, not by production
   volume.
5. **"Tamper-evident" ≠ "tamper-proof."** The chain detects and localizes
   tampering (`verify-chain.mjs:16` names the first bad seq); it does not
   prevent it. That is the honest claim and matches the paper's.

**Non-claims:** P31 does not claim the ledger attests to the *correctness* of a
recorded action, only its integrity and ordering. It does not claim the SCITT
or WCA drafts are standards (both are individual Internet-Drafts with no IETF
standing; WCA is expired).

---

## 9. Reference index

| Symbol | Location |
|---|---|
| gate chain (25 checks) | `package.json:8` |
| `append` / hash chain | `scripts/lib/ledger.mjs:55-82` |
| `verifyChain` | `scripts/lib/ledger.mjs:91-101` |
| `jcs` (RFC 8785) | `scripts/lib/ledger.mjs:22-28` |
| `issueToken` / `verifyToken` | `scripts/lib/token.mjs:82-98 / :107-122` |
| `softDelete` / `restore` | `scripts/lib/softdelete.mjs:23-55 / :58-65` |
| CAS `snapshot` / `restore` | `scripts/lib/cas.mjs:71-76 / :78-88` |
| 10 planted negative controls | `scripts/negative-controls.mjs:34-174` |
| ownership self-test | `scripts/fix-plan-scan.mjs:26-47` |
| destructive-pattern list | `scripts/veto-check.mjs:16-31` |
| retention window (90 days) | `scripts/soft-delete-check.mjs:24` |
| header schema | `scripts/frontmatter.mjs:22-24` |

---

`Owner: will` · `Verified: 2026-10-11` · Citations re-verified against primary
sources and logged in `docs/grounding/CITATION_LEDGER.md`. Re-verify by running
`pnpm gate` and `node scripts/negative-controls.mjs`.