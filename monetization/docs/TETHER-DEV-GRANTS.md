# Tether Dev Grants — P31 Capital Machine

**Amount:** $1,500–$4,000 (open tech stack tier)
**Status:** DRAFT — submit at tether.dev/grants

## Fits Tether's stated priorities
- **Open tech stack** — P31 is fully open source, from the Workers to the ledger
  to the neuroinclusive UI (MIT-adjacent).
- **Real payments, real users** — the x402 MCP server settles in USDC on Base
  mainnet; the revenue ledger records every settled call with SHA-256 prev-hash
  links (`verify-chain` → `valid:true`).
- **Agent-native tooling** — the MCP server, OAuth 2.1 / RFC 8707, Bazaar
  discovery extension, all live.

## Deliverables ($4,000 tier)
1. **x402 settlement hardening** ($1,200) — durable settlement retries, ledger
   reconciliation, and the first Bazaar-indexed endpoint.
2. **Open-source the capital-routing take-rate mechanism** ($1,500) — the piece
   the AI-gateway research identified as genuinely novel (a fee on capital
   operations, not API calls).
3. **Public reference agent** ($800) — a working example any agent developer can
   copy to pay for, and consume, a capital machine over x402.
4. **Documentation + outreach** ($500).

## Evidence
- x402 MCP server: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev`
- Revenue ledger: `/revenue/verify-chain` → `valid:true`
- Trust Center: `https://monetization.p31ca.org/trust`
- Repo: `/home/p31/production/monetization` (open source)