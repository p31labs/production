# Production Readiness — LOOM · QPJ · p31ca.org · phosphorus31.org

**Status**: research-backed readiness roadmap, 2026-09-22. Honest about what's ready, what's a gap, and what costs what.

---

## The 2026 bar (verified)

What production agent governance requires this year:

| Requirement | Source | LOOM status |
|---|---|---|
| Pre-execution policy gate | Gartner AI TRiSM / governance playbooks: "prevent bad actions before they happen" | ✅ `guardAgentEvent` before `commitToD1` |
| Hash-chained tamper-evident audit trail | SHA-256 per RFC 8785, independently verifiable | ✅ `events` + `refusals` chains, `/verify` |
| Agent identity (unique, non-human) | SOC 2 CC8.1: "AI-initiated change needs the same authorization, documentation, testing, and approval evidence as a human one" | ✅ PQC capability tokens, DID-bound |
| Human approval gates | "Human approval workflows for high-risk actions" | ✅ co-presence: proposes, never acts |
| EU AI Act Art 12 logging | Applies **2 Dec 2027** (Annex III) / **2 Aug 2028** (Annex I) — staged by the Digital Omnibus (Reg (EU) 2026/1744); Art 50 transparency + general application already operative 2 Aug 2026 | ✅ compliant before the deadline |

**The Loom is architecturally ready before the standards.** The gaps below are about *evidence and distribution*, not architecture.

---

## 1. LOOM — what's left

| Item | Effort | Cost | Priority |
|---|---|---|---|
| **Concierge test** (one human session) | 90 min | $0 | **P0** — "who uses this?" must have an answer |
| **Self-serve onboarding** (create-family-workspace flow, PQC keygen on first visit) | 3–4 wk | $0 | High — the product, not a demo |
| **ISO 42001 readiness** (the accessible certification: $4–25K, 4–12 mo; SOC 2 Type I is $12–40K) | 2–4 wk docs | $0–start | High — the affordable third-party assurance |
| **MCP `iss` validation** — MCP graduated to enterprise infra; the spec now *mandates* `iss` validation (OAuth 2.0/OIDC alignment, closes mix-up attacks) | scan 19 MCP servers | $0 | Critical |

Scan result (2026-09-22): the hardened token path (`doc-relay/src/auth.ts`) validates `iss`/`aud` via `expectAud` (self-contained capability tokens). The public MCP servers (`design-mcp`, `crypto-mcp`, `p31-mcp-server`) are **read-only/unauthenticated catalogs** — acceptable as public tools, but must be documented as such; the monetized gateway (`mcp-x402`) is where `iss` validation is required before per-tool billing, per the 2026 MCP auth alignment.
| **Public 3-min demo** (the concierge session, filmed) | 1 wk | $0 | High — the pitch |
| SOC 2 Type I (unaffordable now) | 3–8 mo | $12–40K | Defer — the readiness doc is free, the audit isn't |

Note: competitors are certifying (Ollie just hit SOC 2). The family-AI field is crowded (Ollie $7.5M seed, Cozi, Ava, Maple, Fambot, SuperNori, Google CC, Meta Muse). P31's differentiator remains **verifiable governance + PQC identity** — none of them have it. ISO 42001 is the affordable way to make the claim certifiable.

## 2. QPJ (Quantum Pickle Jar) — the family workspace

| Item | Status |
|---|---|
| Access on custom domain | ✅ done (`loom.p31ca.org` 302→login / service-token 200) |
| Service-token attribution quirk | ⚠️ documented (headers stripped on Access-gated hostnames; chain commits) |
| **Family onboarding flow** | ❌ the gap — "create a family workspace," PQC keypair on first visit |
| **Donation path** | ❌ build — simplify to name/email/amount (+52% conversion per research) |
| **Live impact dashboard** | ❌ build — the `/api/loom/verify` chain status as a widget (top trust+SEO factor) |
| **WebMCP framing** | ⚠️ **be honest**: WebMCP is Chrome-146-Canary/experimental, security model undefined, production ~2027. Frame the NLnet/WebMCP work as R&D-on-a-preview-standard, not production-ready. |

## 3. Marketing sites — p31ca.org + phosphorus31.org

| Item | Effort | Priority |
|---|---|---|
| **Simplify donation form** (1.6% baseline; form simplification → +52%; top pages exceed 30%) | 1 day | **Critical — this is revenue** |
| **Live chain verification on homepage** (`/api/loom/verify` embedded) | 2 days | High — the proof |
| **Nonprofit Organization Schema Markup** (JSON-LD `@type: NGO`) — makes the site legible to AI agents | 1 day | High — WebMCP-era discoverability |
| **Grant-pipeline page** (show the pipeline is real) | 1 wk | Medium |
| **Agent-readiness manifest discoverability** (`/.well-known/mcp/server-card.json` + A2UI catalogs are live) | 2 days | High |

---

## The affordable certification path (zero-budget order)

1. **ISO 42001 readiness doc** — write the AI Management System evidence (the Loom's own governance docs ARE the evidence base: `GOVERNANCE.md`, `PROOF-OF-BEHAVIOR.md`). $0. The actual certification ($4–25K) becomes fundable by a grant.
2. **MCP hardening scan** — validate `iss` on every public MCP server; document. $0, closes the enterprise-infra gap.
3. **Donation + chain widget + schema markup** — $0, same week.
4. **Concierge test** → the demo video → the Sentient/NLnet applications.

**The one-sentence version**: the Loom is architecturally ready before the standards (EU AI Act Art 12 logging — compliant before the high-risk deadline of 2 Dec 2027 / 2 Aug 2028, staged by the Digital Omnibus Reg (EU) 2026/1744; Art 50 transparency already operative; SOC 2 CC8.1 change-evidence — the event log *is* the evidence; MCP now mandates `iss` validation), and the family-AI market is crowded but no competitor has verifiable governance or PQC identity — so the final steps are not more architecture but evidence and distribution: the concierge test (P0), an ISO 42001 readiness doc (the affordable $4–25K path vs SOC 2's $12–40K), an MCP `iss` scan, a simplified donation form (+52%), a live chain-verification widget on both sites, Nonprofit Organization Schema Markup, and honest WebMCP framing (Canary, production ~2027) — while the corrected grant pipeline leads with the actually-open Georgia funds (Rural Tech Fund, GA Digital Equity, Coastal Georgia Foundation), Sentient (rolling, $42M), and NLnet (Nov 3).