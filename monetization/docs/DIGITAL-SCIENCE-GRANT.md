# Digital Science Catalyst Grant — P31 Capital Machine

**Amount:** up to £25,000
**Deadline:** 2026-10-05
**Status:** DRAFT — submit at catalyst.digital-science.com

## Fit
Digital Science Catalyst funds early-stage, agentic AI workflows that improve
research infrastructure. P31's contribution: a provable, hash-chained payment
and provenance layer for autonomous agents — the missing audit substrate for
agentic research pipelines.

## Problem
Agentic AI workflows (literature search, data retrieval, compute leasing)
increasingly transact autonomously, but there is no open provenance layer: a
research consumer cannot verify that a payment was made, to whom, for what, or
whether the receiving agent's revenue record is tamper-free.

## Solution
P31 Capital Machine — an open-source, x402-native agent-payment + provenance
layer:
- Hash-chained revenue ledger (SHA-256, `/revenue/verify-chain` → valid:true)
- MCP server with 11 tools, per-call USDC pricing, OAuth 2.1 / RFC 8707
- Bazaar discovery extension emitted on every 402 challenge
- Capacity-aware UI (neuroinclusive) for operators of agent pipelines

## Workplan
| Month | Deliverable |
|---|---|
| 1 | Formalize the provenance contract: hash-chain schema + verify API |
| 2 | Publish open reference implementation (MCP server + ledger) |
| 3 | Integrate with one research data provider as a PoC |
| 4 | Write the provenance-in-agentic-research paper (open access) |
| 5 | Run a workshop for research-infrastructure engineers |
| 6 | Ship v1.0 spec + hardening (OAuth 2.1, SLOs, Trust Center) |

## Budget (£25,000)
Formalization + research paper £8,000 · Reference implementation £7,000 ·
PoC integration £5,000 · Workshop + documentation £3,000 · Infrastructure £2,000

## Evidence
- Live MCP server: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev`
- Revenue integrity: `/api/revenue/verify-chain` → `{"valid":true}`
- Trust Center: `https://p31-monetization.trimtab-signal.workers.dev/#/trust`
- Revenue mesh (every avenue typed into one ledger): `https://revenue-sink.trimtab-signal.workers.dev`