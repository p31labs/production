# NLnet Proposal — P31 Capital Machine

**Applicant:** P31 Labs (individual/small team; open, sovereign stack)
**Request:** €25,000–€50,000 (R&D grant)
**Deadline:** 2026-11-03 (NLnet odd-month open call)
**Status:** DRAFT — ready for submission review

---

## 1. Problem

The agent economy has a payment rail (x402) and a tool-discovery layer (MCP, Bazaar),
but no **sovereign capital-management surface** that a community can fund, own, and
verify. Existing dashboards (Coinbase Advanced, MetaMask Portfolio, Ripple Treasury)
are corporate, density-first, and opaque. Three concrete gaps:

1. **No verifiable revenue provenance.** Agent payments settle, but nobody can
   prove the money trail without trusting the platform. P31 records every
   settlement in a **SHA-256 hash-chained ledger** with an independent verify path.
2. **No capacity-aware financial interface.** 1.3B people live with significant
   disability; 16% of the global population. Financial UI is built for peak
   attention. P31's **spoon-dial** lets the user declare their available cognitive
   capacity and the interface adapts (motion, density, disclosure).
3. **No community-owned capital machine.** Funding for public digital infrastructure
   is either charity or venture. P31 is **community-funded, community-owned**, with
   soulbound-token recognition for all forms of contribution (capital, code,
   advocacy, expertise).

## 2. Solution

**P31 Capital Machine** — an open-source, neuroinclusive, agent-native capital
management system:

- **x402-native MCP server** (11 tools, paid per call in USDC on Base mainnet,
  OAuth 2.1 / RFC 8707 resource server, hash-chained revenue).
- **Hash-chained revenue ledger** (`/revenue/verify-chain` returns `valid:true`;
  every entry carries a prev-hash link).
- **Capacity-aware UI** — spoon-dial drives motion scale, info density, and
  progressive disclosure across 15 portal surfaces.
- **Soulbound recognition** — per-DID SHA-256 SBT chain for contributions;
  governance voting weighted by contribution diversity, not capital.
- **Enterprise readiness, open source** — DORA metrics, SLOs/error budgets,
  SBOM, Trust Center, RBAC — all built in-house on Cloudflare Workers + D1.

## 3. Workplan (R&D deliverables)

| Phase | Deliverable | Months |
|---|---|---|
| A | Neuroinclusive interaction model — formalize the spoon model; publish a research artifact (motion/density/disclosure mapping + evaluation) | 1–4 |
| B | SBT contribution-recognition system — contribution registry, badge SBTs, governance-weighted voting | 2–6 |
| C | Open-source release of the capital-routing take-rate mechanism + community governance framework | 4–8 |
| D | Hardening: OAuth 2.1 IdP, Cloudflare Access, SBOM signing, SOC 2 readiness index | 6–10 |

All outputs released under OSI-approved / FSF-approved free-software licenses;
all scientific outcomes open access.

## 4. Why it fits NLnet

NLnet funds an open, resilient, trustworthy, sustainable, human-centered internet.
P31 directly targets **digital sovereignty** (community-owned capital machine),
**trust** (hash-chained, verifiable provenance), and **human-centered design**
(neuroinclusive, capacity-aware). It reuses public digital commons (x402, MCP,
Cloudflare Workers, D1) rather than reinventing them.

## 5. Budget (€30,000 indicative)

| Item | € |
|---|---|
| Neuroinclusive research + evaluation (3 mo) | 10,000 |
| SBT recognition + governance system (2 mo) | 8,000 |
| Capital-routing release + hardening (3 mo) | 8,000 |
| Infrastructure (Cloudflare Workers/D1, domains) | 2,000 |
| Documentation + community facilitation | 2,000 |

## 6. Contact & links

- Portal (Trust Center): https://p31-monetization.trimtab-signal.workers.dev/#/trust
- MCP server: https://p31-capital-machine-mcp.trimtab-signal.workers.dev
- Revenue integrity: /api/revenue/verify-chain → `{"valid":true}`