# P31 Capital Machine — Agent-Native Capital Gateway

The P31 Capital Machine exposes a monetized, agent-native interface to its capital
operations through the x402-gated MCP server `p31-capital-machine-mcp`. This document
covers the model, payment mechanics, tool catalog, calling patterns, revenue
provenance, and the mainnet settlement rollout. Base endpoint:
`https://p31-capital-machine-mcp.trimtab-signal.workers.dev`

---

## 1. The model — capital routing vs inference routing

Most agent monetization prices the commodity of intelligence and computation. Market
research context (public, for framing only):

- OpenRouter charges a ~5.5% take rate on AI inference spend (~$140M annualized
  revenue); Stripe acquired it for ~$7.5B.
- Cloudflare's Monetization Gateway (July 2026) charges per-request for any web
  resource via x402 stablecoin settlement.
- Circle's Agent Stack lets API providers charge AI agents per request in USDC over
  x402, with no API keys.

P31's differentiated mechanic: where those players route *inference*, the P31 Capital
Machine routes *capital* — it intermediates financial actions (rebalances,
compounding, MEV/arbitrage execution) and takes a routing fee on the operation itself.

Why this is differentiated:
- The unit of value is a live financial operation, not a model call, so pricing maps
  to capital impact rather than token volume.
- The payer is an autonomous agent with a wallet: billing is native, the 402 challenge
  settles in USDC on-chain with no API keys, subscriptions, or invoicing.
- Fees land in a SHA-256 hash-chained revenue ledger for verifiable provenance, and
  operator-gated tools add a human trust layer over the payment gate for high-impact
  capital actions.

---

## 2. The mechanics

### 2.1 The x402 flow (agent to settled tool run)

1. The agent calls a paid MCP tool over POST /mcp (JSON-RPC: initialize / tools/list /
   tools/call).
2. If unpaid, the server answers with a real HTTP 402 Payment Required challenge:
   scheme `exact`, network `base-sepolia`, pay_to
   `0x51c285Df171C76bE36252e32679F098d90768413`.
3. The agent constructs and settles the payment for the tool's listed USDC price.
4. The agent resends the tool call with the payment token.
5. The tool executes and proxies to the portal API
   (`https://p31-monetization.trimtab-signal.workers.dev/api/...`).

### 2.2 The operator token gate

Operator-gated tools require the header `X-Operator-Token` matching the worker's
`OPERATOR_TOKEN` secret (`wrangler secret put OPERATOR_TOKEN`). Without it the server
returns MCP isError 403, even after payment.

### 2.3 Routing-fee recording

Every paid tool call records a revenue-ledger entry: source `x402`, payer_did (from
`X-DID`), merchant_did (`pay_to`), amount_usdc (tool price), and metadata (tool,
network, mcp `p31-capital-machine`, routing_fee, operation). The ledger is SHA-256
hash-chained, so each entry is provably ordered and unalterable.

---

## 3. Tool + pricing table

The tool catalog with prices and gating:

| Tool | Price (USDC) | Operator-gated | Proxies to portal API |
| --- | --- | --- | --- |
| `revenue.getSummary` | $0.02 | no | — |
| `positions.list` | $0.01 | no | — |
| `opportunities.scan` | $0.01 | no | — |
| `allocator.rebalance` | $0.10 | yes | POST /api/allocator/rebalance |
| `compounder.trigger` | $0.05 | yes | POST /api/auto-compounder/compound |
| `opportunities.execute` | $0.25 | yes | POST /api/mev-arbitrage/execute |
| `entitlement.check` | free | no | — |
| `billing.listTiers` | free | no | — |
| `health` | free | no | — |

### 3.1 Spend limits

Operator-gated capital tools are subject to a spend-limit gate on top of the
operator token and x402 payment. The gate enforces a `max_spend` parameter:

- `max_spend` defaults to **$10** for a capital operation.
- Amounts above **$100** require `confirmOverLimit: true` in the tool
  arguments; without it the server rejects the call with an error instructing
  the caller to set `confirmOverLimit=true` (owner approval required).
- Amounts in the discretionary band above the $10 default but at or below $100
  are permitted under the operator token (the operator gate already authorizes
  the call).

The gate applies to `opportunities.execute` (the MEV arbitrage execution tool,
which deploys capital) and mirrors the si-wallet-mcp mandate pattern.

### 3.2 Status endpoints

`allocator.status` and `compounder.status` are **free read tools** (not paid,
not operator-gated). They expose capital allocator health / last-rebalance
status and auto-compounder status (active position count and total deposited)
respectively, and return 200 without payment, x402 settlement, or an operator
token.

Endpoints served: `GET /health`, `GET /.well-known/mcp`, `GET /.well-known/mcp-pricing`,
and `POST /mcp`.

---

## 4. How to call it

All calls target `https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp`.

### 4.1 Discover tools (tools/list)

```bash
curl -s https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### 4.2 Free tool call

```bash
curl -s https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"health","arguments":{}}}'
```

### 4.3 Paid read call (expect 402)

```bash
curl -s https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp \
  -H 'content-type: application/json' \
  -H 'X-DID: did:key:z6Mk...' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"positions.list","arguments":{}}}'
```

Unpaid: returns HTTP 402 with `scheme=exact`, `network=base-sepolia`, pay_to
`0x51c285Df171C76bE36252e32679F098d90768413`.

### 4.4 Operator-gated write call

```bash
curl -s https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp \
  -H 'content-type: application/json' \
  -H 'X-DID: did:key:z6Mk...' \
  -H 'X-Operator-Token: <OPERATOR_TOKEN>' \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"compounder.trigger","arguments":{}}}'
```

Requires settlement (402) plus the operator token; a missing/wrong token returns MCP
isError 403.

---

## 5. Revenue & provenance

Every paid call appends an entry to the revenue ledger with source `x402`, payer_did,
merchant_did (`pay_to`), amount_usdc, and metadata (tool, network, mcp, routing_fee,
operation). The ledger is SHA-256 hash-chained, so each entry binds to the previous
block's hash and any tamper attempt breaks the chain.

Verification: call the revenue chain verifier via `/audit/verify`; it returns
`valid: true`, confirming every recorded fee is intact and in order.

---

## 6. Rolling out mainnet settlement

Mainnet rollout switches settlement from the base-sepolia test facilitator to Coinbase
CDP:

1. Switch the facilitator to Coinbase CDP: `api.cdp.coinbase.com/platform/v2/x402`.
2. Set `NETWORK=base`.
3. Set the required wrangler secrets: `FACILITATOR_KEY_ID`, `FACILITATOR_SECRET_KEY`,
   and `OPERATOR_TOKEN` (via `wrangler secret put`).

After rollout, paid tool calls settle in USDC on base mainnet through Coinbase CDP;
the operator gate continues to protect high-impact capital tools.