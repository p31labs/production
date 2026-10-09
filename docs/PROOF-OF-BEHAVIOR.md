# Proof-of-Behavior Compliance Statement — P31 Loom

**Status**: technical compliance artifact · maps the Loom to the 2026 IETF agent-governance drafts
**Purpose**: the reference-implementation claim, made legible to grant reviewers, auditors, and technical buyers.

The IETF published drafts in 2026 that specify — almost line-for-line — what the Loom already runs in production. None of the big three (Google, Anthropic, Kilo) have shipped this stack. This document maps each verified draft to the concrete code path.

> ⚠️ **Correction (2026-09-22, verified against the IETF datatracker):** the "Proof-of-Behavior Protocol" was previously cited as `draft-dembowski-agentledger-proof-of-behavior-00`. **That draft does not exist** (0 results on datatracker.ietf.org). It is deleted. The Loom's enforcement architecture is now described against the **verified** drafts that actually exist: Agent Audit Trail (`draft-sharif-agent-audit-trail-04`), AIC-JWT (`draft-wei-aic-jwt`), AIP (`draft-prakash-aip`), MTAC (`draft-burls-mtac`), and the WIMSE working group's architecture (`draft-ietf-wimse-arch-08`). Do not re-add the dembowski draft.

---

## 1. Pre-execution enforcement (the "proof-of-behavior" capability)

P31's own term for its enforcement layer is **Proof-of-Behavior** — a descriptive capability name, not an IETF draft. It maps to the WIMSE working group's direction (AI agent identity + audit) and the verified AAT draft:

> AAT: records linked via **SHA-256 hash chaining per RFC 8785**; maps to **EU AI Act (Regulation 2024/1689), SOC 2, ISO/IEC 42001, PCI DSS v4.0.1**.

| Capability | Loom implementation | Location |
|---|---|---|
| Pre-execution policy gate | `guardAgentEvent` runs **before** `commitToD1`; the gate is the PEP, the `LumiSession` DO is the PIP | `apps/loom/functions/api/loom/_lib/log.ts` |
| Hash-chain linking (SHA-256, RFC 8785 JCS) | `events` + `refusals` tables, `prev_hash` per row, `canonicalize` (JCS) → `hashRecord` | `packages/canon/src/loom/hash-chain.ts` |
| Signed receipt / independent verification | `GET /api/loom/verify` recomputes the chain and names the first broken record | `apps/loom/functions/api/loom/verify.ts` |
| Cross-agent reference | `traverse` events link agent actions across nodes; proposal↔decision binding by `id` | `packages/canon/src/loom/training.ts` |
| Writer-per-kind (agent never writes human kinds) | `HUMAN_KINDS`/`AGENT_KINDS` single-source sets, enforced in the gate | `packages/canon/src/loom/gate.ts` |

## 2. Agent Audit Trail (AAT, draft-sharif-agent-audit-trail)

> Records linked via **SHA-256 hash chaining per RFC 8785**; maps to **EU AI Act (Regulation 2024/1689), SOC 2, ISO/IEC 42001, PCI DSS v4.0.1**. The EU AI Act's high-risk logging requirement applies **2 Dec 2027 (Annex III) / 2 Aug 2028 (Annex I)** — staged by the Digital Omnibus (Reg (EU) 2026/1744); Art 50 transparency is already operative (2 Aug 2026).

The Loom's chain uses the identical SHA-256 + RFC 8785 canonicalization. The refusal sidecar (`refusals` table) records every gate refusal/observation in the same canonical form — the EU AI Act "automatic recording of events" requirement, satisfied before the deadline. `GOVERNANCE.md` §4 documents the sidecar's independence from the events chain (both verifiable by the same `verifyChain`).

> **AAT revision -04 (2026-09-15, verified on datatracker):** adds post-quantum signatures (**ML-DSA-65**, FIPS 204) alongside ECDSA P-256; a key identifier (`signer_kid`, RFC 7638); **trust-level assignment integrity** (Sec 5.3 — downgrading a consequential action must be an attributable event, not silent suppression); and **optional Merkle batch anchoring** (Sec 6.4, RFC 6962). The -03 revision (Aug 2026) added the **Decision Reproducibility** section (Sec 13) with **Attestation Closure** (Sec 13.6): decision-reproducibility digests must cover the model weights, tokenizer, chat template, inference engine build, decoding configuration, and numeric environment. -04 verifiers stay backward compatible with -03.

The Loom's PQC capability tokens are already ML-DSA-65 (`@p31ca/sovereign-primitives`), which aligns with the -04 signing direction. The `guardAgentEvent` pre-execution gate satisfies the -01 `record_phase: pre_execution` requirement for denials (a refused action is recorded in the sidecar **before** it could execute). Open gap for full -03/-04 alignment: the propose event does not yet carry model provenance (`model_id`, `tokenizer_digest`, `chat_template_digest`, `engine_build_digest`) — a Phase 2.5 item, not a blocker for the Humanity AI (governance) application.

## 3. AIC-JWT (draft-wei-aic-jwt-01, September 2026)

> "The cryptographic identity of an AI agent is bound to a responsible principal, together with a structured **capability container**, delegation mode, authorization constraints, and **principal-signed delegation evidence**."

`LumiCapabilityToken` is an AIC-JWT: `iss` = Lumi's `did:key`, `aud` = `p31-loom`, `caps` = attenuated authorization, `exp` = 15 min. `makeLumiTokenVerifier` (`@p31ca/agent-engine/src/lumi-identity.ts`) binds the agent to the principal and the `ScopeGuard` enforces the caps — the token, not a parallel declaration, drives what Lumi may emit.

## 4. AIP (draft-prakash-aip, IBCTs) + MTAC (draft-burls-mtac)

> AIP: Invocation-Bound Capability Tokens "bind identity, authorization, scope constraints, and provenance into a single cryptographic artifact." MTAC: batch-issued agent credentials signed with **ML-DSA-65**.

`@p31ca/sovereign-primitives` implements composite **Ed25519 + ML-DSA-65** signatures (the exact MTAC/AIP requirement), used by the doc-relay's capability tokens and the Loom's Lumi identity. The hash-chained log is the provenance layer.

## 5. Market context (Mordor Intelligence, 2026)

- Agent observability & governance: **$1.68B (2026) → $8.62B (2031), 38.69% CAGR**.
- **77% of enterprises have AI-agent policies; only 26% can enforce them** (McKinsey via OPAQUE).
- Governance startups raised in 2026: Zenity $125M, Neo $100M, Runta $20M, Naïve $28.5M.

The gap is enforcement, not policy. The Loom is an enforcement layer.

## 6. The claim

> P31 is the reference implementation of the IETF's agent-governance stack — Agent Audit Trail, AIC-JWT, AIP, MTAC, aligned with the WIMSE working group — deployed in production, family-scoped, self-hosted, with post-quantum identity and a hash-chained audit trail any third party can independently verify. ("Proof-of-Behavior" is P31's descriptive name for its pre-execution enforcement layer, not an IETF draft.)

Live evidence: `loom.p31ca.org` (Access-gated), `GET /api/loom/verify`, `GET /api/loom/refusals/verify`, 7 production portals, `@p31ca/canon` on npm (Apache-2.0).