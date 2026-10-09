# EXANTE Gecko Fund — P31 Capital Machine

**Applicant:** P31 Labs (open-source, community-funded)
**Request:** €25,000–€50,000 (range €10K–€150K, quarterly review)
**Status:** DRAFT — adapt from NLnet proposal, submit at geckofund.org

## Fit (Gecko Fund criteria)
The Gecko Fund funds open-source projects that underpin trading and financial
data systems. P31 is JavaScript/TypeScript (Cloudflare Workers + React), fully
open source, and directly relevant:

- **Adoption**: live MCP server (11 tools, x402 on Base mainnet), live portal
  (15 surfaces), hash-chained revenue ledger, SLOs/DORA/Trust Center.
- **Relevance to financial markets**: agent-native payments (x402), capital
  routing (allocator.rebalance, opportunities.execute), hash-chained revenue
  provenance for trading/financial data APIs.
- **Impact of funding**: open-source release of the capital-routing take-rate
  mechanism, the neuroinclusive spoon-dial model, and the SBT governance layer.

## Problem
The agent economy has a payment rail (x402) but no sovereign, verifiable,
capacity-aware capital-management surface. Existing financial dashboards are
corporate, opaque, and density-first.

## Solution
P31 Capital Machine — open-source, neuroinclusive, agent-native:
- x402-native MCP server (OAuth 2.1 / RFC 8707, `.well-known` metadata)
- SHA-256 hash-chained revenue ledger with independent verify path
- Spoon-dial capacity-aware UI (motion/density/disclosure)
- SBT-weighted community governance (contribution, not capital)

## Workplan (6–10 months)
| Phase | Deliverable | Months |
|---|---|---|
| A | Neuroinclusive interaction model — formalize + publish spoon model | 1–4 |
| B | SBT contribution recognition + governance voting | 2–6 |
| C | Open-source release of capital-routing mechanism + community governance | 4–8 |
| D | Hardening: OAuth 2.1 IdP, Cloudflare Access, SBOM signing, SOC 2 readiness | 6–10 |

## Budget (€30,000 indicative)
Neuroinclusive research €10K · SBT/governance €8K · capital-routing release €8K ·
infrastructure €2K · docs/community €2K.

## Evidence links
- Trust Center: https://p31-monetization.trimtab-signal.workers.dev/#/trust
- Revenue integrity: /api/revenue/verify-chain → `{"valid":true}`
- MCP server: https://p31-capital-machine-mcp.trimtab-signal.workers.dev