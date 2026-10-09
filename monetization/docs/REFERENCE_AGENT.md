# Reference Agent — P31 Capital Machine Integration

A short guide for an AI agent (for example a Claude or Claude Code agent) that wants to
use the P31 Capital Machine over MCP. It covers discovery, reads, operator-gated
capital actions, the x402 settlement handshake, and verification of recorded routing
fees.

Server: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev`

---

## Step 1 — Discover the service

Two ways to discover:

- `GET /.well-known/mcp` — service metadata and MCP endpoint.
- `GET /.well-known/mcp-pricing` — the tool catalog with USDC prices and gating.
- `POST /mcp` with JSON-RPC `tools/list` — the same catalog in-band.

```json
{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}
```

The catalog:

| Tool | Price (USDC) | Gate |
| --- | --- | --- |
| `revenue.getSummary` | $0.02 | paid |
| `positions.list` | $0.01 | paid |
| `opportunities.scan` | $0.01 | paid |
| `allocator.rebalance` | $0.10 | paid + operator |
| `compounder.trigger` | $0.05 | paid + operator |
| `opportunities.execute` | $0.25 | paid + operator |
| `entitlement.check` | free | none |
| `billing.listTiers` | free | none |
| `health` | free | none |

## Step 2 — Read revenue, positions, opportunities

These are paid reads, priced in USDC, and settle through x402:

- `revenue.getSummary` ($0.02)
- `positions.list` ($0.01)
- `opportunities.scan` ($0.01)

Send the call with an `X-DID` header so the server can record `payer_did` on the
revenue-ledger entry. If the call is unpaid the server responds with a real HTTP 402
Payment Required challenge (scheme `exact`, network `base-sepolia`, pay_to
`0x51c285Df171C76bE36252e32679F098d90768413`). Settle, resend, and receive results.

## Step 3 — Operator-gated capital actions

Capital operations — `allocator.rebalance` ($0.10), `compounder.trigger` ($0.05),
`opportunities.execute` ($0.25) — proxy to the P31 Capital Machine portal API:

- `allocator.rebalance` → `POST /api/allocator/rebalance`
- `compounder.trigger` → `POST /api/auto-compounder/compound`
- `opportunities.execute` → `POST /api/mev-arbitrage/execute`

These require both:

1. Payment settlement via the 402 handshake (see Step 4).
2. An operator token. The agent holds the operator token and sends it as the header
   `X-Operator-Token`, which must match the worker's `OPERATOR_TOKEN` secret. Without a
   matching token the server returns MCP isError 403 even if payment is settled.

## Step 4 — The x402 settlement handshake

Pseudocode of the settlement loop:

```text
function callTool(name, args, opts):
    headers = { "content-type": "application/json" }
    if opts.did:  headers["X-DID"] = opts.did
    if opts.operatorToken: headers["X-Operator-Token"] = opts.operatorToken

    body = { "jsonrpc": "2.0", "id": nextId(), "method": "tools/call",
             "params": { "name": name, "arguments": args } }

    resp = POST mcpEndpoint, body, headers

    if resp.status == 200:
        return parse(resp)                 # free tool, or already settled

    if resp.status == 403:
        error("MCP isError 403: missing or wrong X-Operator-Token")

    if resp.status == 402:
        challenge = parseChallenge(resp)   # scheme, network, pay_to, amount_usdc
        assert challenge.scheme == "exact"
        assert challenge.network == "base-sepolia"

        # construct and settle the payment for amount_usdc to pay_to
        payment = constructPayment(challenge.amount_usdc, challenge.pay_to,
                                   challenge.network)
        settlePayment(payment)             # obtain proof token / receipt

        # resend the original call with the payment token attached
        resp = POST mcpEndpoint, body, headers + paymentTokenHeader(payment)
        if resp.status == 200:
            return parse(resp)
        else:
            error("resend failed: " + resp.status)
    else:
        error("unexpected status: " + resp.status)
```

Key points:

- A 200 response means the tool ran; the charge for paid tools is recorded on the
  revenue ledger.
- A 402 is not an error — it is the payment request. Treat it as the settlement step.
- After settlement, resend the identical tool call with the payment token; do not
  change the tool name or arguments.

## Step 5 — Verify the routing fee in the hash chain

Each paid call records a revenue-ledger entry:

- source: `x402`
- payer_did: from the `X-DID` header
- merchant_did: the `pay_to` address
- amount_usdc: the tool price
- metadata: tool, network, mcp (`p31-capital-machine`), routing_fee, operation

The ledger is SHA-256 hash-chained. After a paid call, verify provenance by invoking
the revenue chain verifier via `/audit/verify` — the chain returns `valid: true`,
confirming the recorded fee is intact and ordered. This gives the agent (and any
auditor) cryptographic proof that the routing fee was recorded.

## Optional — mainnet settlement

Once the operator rolls out mainnet settlement, the facilitator switches to Coinbase
CDP (`api.cdp.coinbase.com/platform/v2/x402`), the network becomes `base`, and the
worker holds `FACILITATOR_KEY_ID`, `FACILITATOR_SECRET_KEY`, and `OPERATOR_TOKEN` as
secrets. The agent's settlement loop is unchanged — only the network and facilitator
behind the 402 challenge change.