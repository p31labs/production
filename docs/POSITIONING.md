# P31 Positioning — the reference implementation

**Status**: strategic positioning, 2026-09-22 (research-backed)

## The frame that wins

Google, Anthropic, and Kilo are building agents that **do things**. P31 is building the governance layer that **proves what agents did** — and never lets an agent act without a human decision. That is a different product category, and it is the category the IETF is standardizing in 2026.

## Verified competitive matrix (2026)

| Dimension | Google | Anthropic | Kilo.ai | P31 |
|---|---|---|---|---|
| Agent platform | Gemini Enterprise Agent Platform (Vertex AI rebrand), Agent Studio, Agent Identity, Agent Gateway | Claude Agent SDK, in-process MCP, 18-event hook system, permission modes | 5M+ coders, 500+ models, BYO key, cloud agents, OS-level sandbox | 7 live portals + phos (35 surfaces) + 19 MCP servers + `@p31ca/cli` (280+ tools) |
| Agent identity | Agent Identity / Agent Gateway (platform service) | MCP-based, not identity-focused | Not the focus | **PQC capability tokens (Ed25519 + ML-DSA-65), DID-bound, live** |
| Audit trail | Enterprise logs (proprietary) | Hook logging (not cryptographic) | Not the focus | **Hash-chained, JCS-canonical, independently verifiable + refusal sidecar** |
| Co-presence | Not shipped | Not shipped | Not shipped | **Enforced at the gate: proposes, never acts** |
| Self-hostable / sovereign | ❌ | ❌ | ⚠️ BYOK, cloud-bound | ✅ Family-scoped, local-first |
| Family-scoped | ❌ (enterprise) | ❌ (coding) | ❌ (coding) | ✅ The only family-first agent governance stack |
| Standards alignment | Proprietary | Proprietary | Proprietary | **WIMSE-aligned · AAT / AIC-JWT / AIP / MTAC** |

**The gap is not features. It is governance.** Everyone is writing policies; almost no one can prove they enforce them (77% have policies, 26% can enforce).

## Why the timing is now

1. **The IETF is writing P31's spec.** Agent Audit Trail (Mar 2026), AIC-JWT (Sep 2026), AIP (Mar 2026), MTAC (Jul 2026), and the WIMSE working group's architecture (rev 08) — all describe what the Loom already runs. The window to be "the implementation that shipped it first" is now. *(Note: the earlier "Proof-of-Behavior" IETF citation was unverifiable and is deleted — see `docs/PROOF-OF-BEHAVIOR.md`.)*
2. **The EU AI Act's high-risk logging requirement applies 2 Dec 2027 (Annex III) / 2 Aug 2028 (Annex I)** — staged by the Digital Omnibus (Regulation (EU) 2026/1744, in force 27 Jul 2026). Art 50 transparency and the general application date are already operative (2 Aug 2026). The Loom is compliant before the high-risk deadline, and its transparency posture is live now.
3. **The market is paying:** $1.68B (2026) → $8.62B (2031) agent observability & governance, 38.69% CAGR. Governance startups raised $273.5M in 2026.

## The claim (one paragraph)

P31 is the reference implementation of the IETF's agent-governance stack — Agent Audit Trail, AIC-JWT, AIP, MTAC, aligned with the WIMSE working group — deployed in production, family-scoped, self-hosted, with post-quantum identity and a hash-chained audit trail any third party can independently verify. Google, Anthropic, and Kilo have users, models, and money. None of them have a live, open, independently verifiable audit trail with PQC identity and co-presence enforcement.

## What this is NOT

This is not "we rival Google." This is a narrow, defensible, true claim: **the governance layer the standards bodies are demanding is the layer P31 already runs.** The assets are the proof — 7 live portals, 30+ live Workers, a hash-chained log with a `/verify` endpoint, PQC signatures in production.

See `docs/PROOF-OF-BEHAVIOR.md` for the technical compliance mapping.