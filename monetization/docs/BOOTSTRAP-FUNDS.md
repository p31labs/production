# Bootstrap Funds — how to get the first settle funded with $0

> The x402 economy assumes pre-funded agents. That's the gap — but 2026 built
> bootstraps for it. Every path below is human-approval-free or instant. Pick
> one, get a payer balance, run `scripts/first-settle.mjs`, and the Bazaar
> indexes P31. The single requirement is ~$0.02 USDC + a few cents of gas on
> Base mainnet — every path here provides exactly that.

## Instant (today, no approval)

1. **x711.io — the AI agent gas station** (fastest)
   - Onboard in one POST → API key + **$0.50 USDC credits** (~10 paid calls) + **free ETH gas** on first call. Free tier: 10 calls/day, no signup.
   - Radio Drop: auto-redeem free **$0.50 credits every ~30 min**.
   - Path: `POST https://x711.io/api/onboard` → get credits → use them to pay P31's `revenue.getSummary` ($0.02).

2. **Voidly Pay — 10 free x402 credits per DID, once, forever**
   - "A bootstrap, not a top-up." Settles <200ms via x402 + USDC on **Base mainnet**.
   - Register identity → create production wallet → claim faucet (use the *production* wallet sequence, not sandbox, or credits won't work).
   - Those credits can pay the P31 call.

3. **Purple Flea — $1 free via faucet**
   - `faucet.purpleflea.com` → $1 free, no deposit. Generates a **Base USDC deposit address**; withdraw earnings to any Base wallet.
   - Withdraw the $1 → now the payer wallet is funded.

4. **Stakely Base mainnet faucet — no registration**
   - ~0.000005 ETH per claim (real mainnet ETH). Stack a few claims to cover gas on the settle.

## This week (free gas, no wallet-ETH needed)

5. **Base Paymaster / CDP signup credits** (you already have a CDP account)
   - Up to **$600 free credits** on signup; **up to $15K** more via Discord (Base Gasless Campaign).
   - Paymaster sponsors gas via ERC-4337 — the payer wallet **never needs ETH**.
   - Sign up at CDP, enable Base Mainnet Paymaster, apply for credits.

6. **CDP signup USDC** — check portal.cdp.coinbase.com for any free USDC/billing credits already on your account (you created a CDP account for the facilitator keys).

## Grants that pay far more (this month)

7. **Base Builder Grant Program — up to $5,000**
   - Explicit focus: "AI Agent applications, x402 payment protocol implementation, autonomous trading." Requires a **live product** (✓ P31 is live) + Base focus.
8. **x402 PROJECT-IDEAS.md micro-grants — up to $3,000**
   - For projects live on mainnet. Submit a ≤2-minute video of an agent using the service; tag @coinbaseDev / contact @murrlincoln.
9. **COTI Web4 Grant — no application required**
   - Agents earn $COTI every 14 days based on on-chain usage; provides skills + wallet + gas.
10. **EXANTE Gecko Fund — €10K–€150K** (draft ready: `docs/EXANTE-GECKO.md`)
11. **NLnet — €5K–€50K** (draft ready: `docs/NLNET-PROPOSAL.md`, deadline Nov 3)
12. **Interledger — $500–$3K** (draft ready: `docs/INTERLEDGER-PROPOSAL.md`)

## The enclave402 bounty (pays back more than it costs)
- Complete one paid call to `https://enclave402.com/api/market/signal?limit=1` → the operator pays **$0.25 USDC** to the first 20 outside wallets. Needs ~$0.003–$0.01 to pay first (use an x711/Voidly credit). Post the `PAYMENT-RESPONSE` tx hash. That $0.25 → fund the payer → settle P31.

## Bottom line
The fastest real path: **x711 or Voidly** gives a payer balance with zero wallet funding today → run `scripts/first-settle.mjs` → one settled `revenue.getSummary` → Bazaar indexes. The **Base Builder Grant** is the highest-value follow-up ($5K for exactly what P31 is).