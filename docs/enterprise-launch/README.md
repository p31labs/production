# Enterprise Market Launch — P31 Labs

**Date**: 2026-09-22 · **Target**: get P31 raised in engineering/board discussions at Google, Anthropic, and Kilo.ai
**Verification**: every claim in this suite resolves to a live URL, a published package, or a verified IETF draft (re-checked today).

---

## The one-line case

> P31 provides **verifiable agent governance and post-quantum identity** for edge-native agent systems — hash-chained audit, capability-bound identity, ML-DSA-65 signatures — **live on Cloudflare Workers and independently inspectable today**. This is fused expertise: a single cognitive system where human direction and computational capability combine complementarily — the same reason the strongest chess players of the era were teams, not either component alone.

## The three proofs (all live, all checkable)

1. **Governance chain (Loom)** — `loom.p31ca.org` (Access-gated). Hash-chained append-only log, RFC 8785 JCS + SHA-256, pre-execution policy gate (`guardAgentEvent` before `commitToD1`), independently verifiable via `GET /api/loom/verify` + `GET /api/loom/refusals/verify`.
2. **PQC identity (Lumi + sovereign-primitives)** — composite Ed25519 + ML-DSA-65 (FIPS 204) signatures; self-contained AIC-JWT capability tokens, 15-min expiry, fail-closed verification. Live relay: `p31-doc-relay.trimtab-signal.workers.dev` (PQC tokens in the auth path).
3. **Edge-native real-time sync (relay)** — production y-websocket relay on Workers/Durable Objects. Health 200 today.

## Standards alignment (verified drafts only)

| Draft | Status (datatracker 2026-09-22) | P31 asset |
|---|---|---|
| `draft-sharif-agent-audit-trail-04` — Agent Audit Trail | ✅ exists | Loom chain (SHA-256 / RFC 8785) |
| `draft-wei-aic-jwt` — AI Agent Identity Certificate JWT | ✅ exists | `LumiCapabilityToken` |
| `draft-prakash-aip` — Agent Identity Protocol | ✅ exists | capability tokens / delegation |
| `draft-burls-mtac` — Merkle Tree Agent Certificates | ✅ exists | Ed25519 + ML-DSA-65 signatures |
| `draft-ietf-wimse-arch-08` — WIMSE architecture | ✅ exists | overall alignment |

> ⚠️ **Removed claim:** `draft-dembowski-agentledger-proof-of-behavior-00` does **not** exist (0 results). Deleted across all docs. "Proof-of-Behavior" is used only as P31's descriptive name for its enforcement layer. See `docs/PROOF-OF-BEHAVIOR.md`.

## Asset inventory (what ships)

| Asset | Status | Enterprise use |
|---|---|---|
| Loom (governance) | live, Access-gated | ✅ **core** — sell/position the governance chain |
| Lumi (agent identity) | code ready; npm stale | ✅ **core** — PQC capability tokens |
| `@p31ca/governance` | **new package** (7 components; facade over design-core) | ✅ **core** — the consumable governance surface; embeddable console base |
| `@p31ca/design-core` | 2.1.0 + M3 Expressive springs (Phase 1 polish) | ✅ design system; SKILL.md + llms.txt agent skill |
| phos PWA | live, 35 surfaces | ⚠️ PQC/crypto components only; family surfaces excluded |
| Relay (y-websocket + PQC) | live | ✅ **core** — proof + sellable infra |
| `@p31ca/cli` | published 3.0.0 | ✅ developer tooling |
| `@p31ca/canon` | **NOT published** (404) | ⚠️ blocker — publish first |
| `@p31ca/sovereign-primitives` | **NOT published** (404) | ⚠️ blocker — publish first |
| `@p31ca/agent-engine` | published but stale (missing lumi-identity) | ⚠️ blocker — republish |
| 7 portals (qpj/design/chat/meatspace/willow/tetra/sixseven) | all live | ❌ COPPA-sensitive — exclude from enterprise materials |
| Spaceship Earth | live; **UNFROZEN 2026-09-23** | ✅ ship — WebGPU + neurodivergent-UX upgrade, hero page at /apps/spaceship-earth |
| p31ca.org / phosphorus31.org | both live | ✅ marketing + trust surfaces |

## Market signals (all cited, 2026)

- Agent observability & governance: **$1.68B (2026) → $8.62B (2031)**, 38.69% CAGR (Research and Markets).
- Agentic AI Governance & Policy Management: **$15.6B (2026) → $173.1B (2034)**, 35.1% CAGR (Research and Markets).
- **87% of orgs planning PQC, only 7% deployed** — execution gap (DigiCert, Jul 2026).
- **54% of top-1M sites support PQC key exchange** (F5, Sep 2026).
- Google Agent Gateway ISV ecosystem (May 2026); Anthropic Enterprise-Managed Authorization for MCP (GA Aug 2026); Kilo KiloClaw for Organizations (Apr 2026, AWS Marketplace, SOC 2).

## Document index

| File | Purpose |
|---|---|
| `positioning.md` | The one-pager: what P31 provides / proofs / packages / contact |
| `asset-readiness.md` | Per-asset enterprise readiness matrix |
| `launch-plan.md` | Sequenced plan: publish → demo → outreach → certifications |
| `outreach-google-anthropic-kilo.md` | Board-room outreach drafts (drafts; human sends) |
| `publish-prep.md` | Verified npm publish state + commands + dependency chain |

## Hard rule

No outreach message claims a metric, package, or standard that isn't linked. No contract accepted without human review of IP terms. All outreach is **draft for human review** — nothing is sent from this repo.