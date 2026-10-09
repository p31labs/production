# Bazaar Unlock — the 2-minute action (once ~$1 Base ETH is available)

The Coinbase x402 Bazaar indexes an endpoint only after **one real on-chain settle**
through the CDP Facilitator. Everything else is already done: the MCP server is live,
routes declare `discoverable: true`, CDP credentials are set, and the validate probe
passes the reachability/HTTPS/402 subset (5/25 — the rest index after a settle).

## Current state (2026-09-25)
- `POST /v2/x402/validate` on `/resources/revenue.getSummary` → **5/25 pass**, `bazaarExtension: false`.
- MCP server: `network: base`, `payTo: 0xF68f0a09b4cbC2D012B6BA01C787d3FFE4C47058`.

## The 2-minute action (when ~$1 Base ETH + USDC is available)

1. **Fund the wallet** — send `0xF68f0a09…` on **Base mainnet** a little ETH (gas)
   and USDC (amount to pay for one call, e.g. $0.02).
2. **Settle one paid call** — use an x402 client (or the Phenix donation wallet) to
   call `POST /mcp` `tools/call` `revenue.getSummary` and complete the 402 handshake
   through the CDP Facilitator.
3. **Verify the ledger** — `GET /api/revenue/verify-chain` → `valid:true` with the
   new `source: x402` entry.
4. **Verify Bazaar indexing** — `GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources` (search for the merchant address or resource URL).

## Requirements recap
- Base ETH (gas) + a small USDC balance on `0xF68f0a09…`.
- The CDP facilitator credentials (`FACILITATOR_KEY_ID` / `FACILITATOR_SECRET_KEY`)
  are already set as secrets on `p31-capital-machine-mcp`.

## If you can't fund it yet
Defer. Everything else in the plan (NLnet application, contributor funnel, content,
governance, infra wiring) proceeds with zero funds. This is the single action that
turns discovery on — but it is a 2-minute action, not a blocker.

## Zero-fund bootstrap (2026 answer)
You don't need to "fund" the wallet from your own pocket. Instant, human-approval-free
bootstraps exist — see **docs/BOOTSTRAP-FUNDS.md** (x711.io $0.50 + free gas,
Voidly Pay 10 free credits, Purple Flea $1, Base Paymaster gas credits) and the
grants pipeline (Base Builder $5K, x402 micro-grants $3K, COTI, Gecko €10K+).
Once any payer balance exists: `node scripts/first-settle.mjs` completes the settle.