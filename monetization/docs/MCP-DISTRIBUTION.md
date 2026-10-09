# MCP Distribution Runbook — p31-capital-machine

Distribution guide for the deployed **p31-capital-machine-mcp** server: an x402-gated
MCP server exposing the P31 Capital Machine surfaces (revenue, positions,
opportunities, billing) over streamable HTTP. Paid tools answer unpaid calls with a
real HTTP 402 Payment Required challenge; settlement lands in the P31 revenue ledger.

## 1. What was built and where it is deployed

The server is live at:

```
https://p31-capital-machine-mcp.trimtab-signal.workers.dev
```

Source: `/home/p31/production/workers/p31-capital-machine-mcp/`
Deploy: `wrangler deploy` from that directory (name `p31-capital-machine-mcp`,
network `base-sepolia`).

### Endpoint table

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Liveness. Returns `{ status, service: 'p31-capital-machine-mcp', timestamp }` |
| `/.well-known/mcp` | GET | Server metadata: name `p31-capital-machine`, version `0.1.0-beta`, tools list, transport `streamable-http`, MCP url `.../mcp` |
| `/.well-known/mcp-pricing` | GET | Per-tool USDC pricing: currency `USDC`, network `base-sepolia`, pay_to `0x51c285Df171C76bE36252e32679F098d90768413` |
| `/mcp` | POST | MCP JSON-RPC: `initialize`, `tools/list`, `tools/call` |

### Tools and pricing

| Tool | Price (USDC) | Notes |
| --- | --- | --- |
| `revenue.getSummary` | 0.02 | Paid. USDC/EUR/LOVE totals, tx count; `source` + `range` filters |
| `positions.list` | 0.01 | Paid. Auto-compounder positions (protocol, chain, amount, apy_bps) |
| `opportunities.scan` | 0.01 | Paid. MEV arbitrage opportunities; `chain` / `status` filters |
| `entitlement.check` | 0.00 | Free. DID entitlement check at an estimated cost |
| `billing.listTiers` | 0.00 | Free. Billing tiers + allowances |
| `health` | 0.00 | Free. Server health |

Paid tools are gated by `x402-hono` + `@coinbase/x402` against the facilitator at
`https://facilitator.x402.org`. An unpaid paid-tool call returns HTTP 402 with an
`X-PAYMENT` challenge header (scheme `exact`, `maxAmountRequired` in micro-units,
e.g. `20000` = $0.02). Free tools stay open for discovery.

## 2. Registering in discovery channels

### 2.1 Official MCP registry (registry.modelcontextprotocol.io)

The public MCP registry is community-submitted via pull request to
`github.com/modelcontextprotocol/registry` (the directory behind
`registry.modelcontextprotocol.io`). Submissions are reviewed and merged by
maintainers.

Credentials needed: a GitHub account.

Steps:

1. Fork `github.com/modelcontextprotocol/registry` and clone your fork.
2. Create `servers/p31-capital-machine.json` in the fork.
3. Publish these config values:
   - `name`: `p31-capital-machine`
   - `description`: x402-gated MCP server exposing P31 Capital Machine surfaces (revenue, positions, opportunities, billing).
   - `url`: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp`
   - `version`: `0.1.0-beta`
   - `transport`: `streamable-http`
   - `tools`: `revenue.getSummary`, `positions.list`, `opportunities.scan`, `entitlement.check`, `billing.listTiers`, `health`
   - `pricing` (reference): `https://p31-capital-machine-mcp.trimtab-signal.workers.dev/.well-known/mcp-pricing`
4. Open a pull request against `modelcontextprotocol/registry` with the new file.
5. Respond to review feedback until merged; the entry then appears in the registry.

### 2.2 Coinbase x402 Bazaar

The Bazaar is the marketplace where x402-paid resources (agents, tools, MCP
servers) are registered and discovered. Exposing a resource requires a Coinbase
Developer Platform (CDP) API key.

Credentials needed: CDP API key (`CDP_API_KEY`, generated in the CDP dashboard).

Steps:

1. Create a CDP project and generate an API key (name + private key). Store it as
   `CDP_API_KEY` in the deployment environment or CI secrets — never in source.
2. Register the resource with the Bazaar resource API:
   `POST https://api.coinbase.com/api/v1/x402/resources` with a Bearer CDP API key.
   Publish these config values:
   - `name`: `p31-capital-machine`
   - `url`: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp`
   - `currency`: `USDC`
   - `network`: `base-sepolia`
   - `pay_to`: `0x51c285Df171C76bE36252e32679F098d90768413`
   - `tools` with per-tool price in USDC:
     - `revenue.getSummary`: `0.02`
     - `positions.list`: `0.01`
     - `opportunities.scan`: `0.01`
   - Free tools are listed in discovery but carry no price.
3. Expose the resource via the Bazaar MCP server (point the Bazaar MCP server's
   resource config at the registered resource so agents can discover it as an MCP
   server).
4. Verify the listing returns the expected price and `pay_to` for base-sepolia.

Automation: `node scripts/register-mcp.mjs` (see the repo) builds this exact
payload and POSTs it when `CDP_API_KEY` and `RESOURCES_REGISTRATION_URL` are set.

### 2.3 AWS Bedrock AgentCore

Bedrock AgentCore connects agents to remote MCP servers; you register the server
so the agent runtime can invoke the tools.

Credentials needed: AWS credentials (Access Key ID + Secret Access Key) and
`AWS_REGION`. Configure them in `~/.aws/credentials` / `~/.aws/config` or
environment (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`).

Steps:

1. Confirm AWS CLI is installed and authenticated (`aws sts get-caller-identity`).
2. From the AgentCore console (or `aws bedrock-agent` CLI), associate a remote MCP
   server for your agent.
3. Publish these config values:
   - `name`: `p31-capital-machine`
   - `url`: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp`
   - `transport`: `streamable-http` (remote server, no command)
   - `tools`: `revenue.getSummary`, `positions.list`, `opportunities.scan`,
     `entitlement.check`, `billing.listTiers`, `health`
   - `pricing` reference: the `.well-known/mcp-pricing` URL above (AgentCore does
     not gate payments; x402 settlement is handled at the server boundary).
4. Attach the MCP server to the agent and confirm the tool schema imports
   successfully in the AgentCore console.
5. Grant the agent's execution role network access to the Workers URL.

Note: Bedrock registration is intentionally manual (AWS CLI/console), out of scope
for `scripts/register-mcp.mjs`.

## 3. Verify an agent can call it

Run these from any shell with `curl`. The MCP server URL is
`https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp`.

### 3.1 List tools

```bash
curl -s https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Expect a JSON-RPC result with the six tools.

### 3.2 Free call (no payment)

```bash
curl -s https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"health","arguments":{}}}'
```

Expect HTTP 200 with `result.content[0].text` containing `{"status":"ok",...}`.

### 3.3 Paid call without payment — expect 402

```bash
curl -i https://p31-capital-machine-mcp.trimtab-signal.workers.dev/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"revenue.getSummary","arguments":{"range":"30d"}}}'
```

Expect HTTP 402 Payment Required with an `X-PAYMENT` header challenge: scheme
`exact`, `maxAmountRequired` in micro-units (`20000` = $0.02 for
`revenue.getSummary`; `10000` = $0.01 for `positions.list` / `opportunities.scan`),
network `base-sepolia`, `payTo` `0x51c285Df171C76bE36252e32679F098d90768413`.

### 3.4 Settle via an x402 client

Using the `@coinbase/x402` SDK (Node):

1. Parse the `X-PAYMENT` header from the 402 response.
2. Call the facilitator (`https://facilitator.x402.org`) to get a quote and
   estimate for the exact amount.
3. Request payment (initiate the transfer on base-sepolia) and obtain the payment
   token.
4. Retry `tools/call` with `X-REQUEST-PAYMENT: <settlement token>` and the same
   `X-DID`/`X-User-DID` header.
5. Expect HTTP 200 with the tool result; the server records the revenue ledger
   entry in the background.

The x402 client handles steps 1-4 automatically; any conformant client
(mcp-client with x402 support, Bazaar agent) will settle transparently.

## 4. Pricing and revenue flow

| Tool | Price (USDC) | Network |
| --- | --- | --- |
| `revenue.getSummary` | 0.02 | base-sepolia |
| `positions.list` | 0.01 | base-sepolia |
| `opportunities.scan` | 0.01 | base-sepolia |
| `entitlement.check` | free | — |
| `billing.listTiers` | free | — |
| `health` | free | — |

Currency is `USDC`, settlement lands on `base-sepolia`, and proceeds are paid to:

```
0x51c285Df171C76bE36252e32679F098d90768413
```

Flow:

1. Agent calls a paid tool without payment -> server returns 402 + `X-PAYMENT`
   challenge (price in micro-units).
2. Agent negotiates with the x402 facilitator and settles the exact amount to
   `pay_to`.
3. Agent retries the call with `X-REQUEST-PAYMENT`; the server proxies execution
   to the P31 Capital Machine portal API
   (`https://p31-monetization.trimtab-signal.workers.dev`) and returns the result.
4. The server records a revenue ledger entry (`POST {REVENUE_LEDGER_URL}/revenue/record`):
   - `source`: `x402`
   - `payer_did`: the caller's `X-DID`/`X-User-DID` (falls back to `did:agent:unknown`)
   - `merchant_did`: `0x51c285Df171C76bE36252e32679F098d90768413`
   - `amount_usdc`: the tool price (e.g. `0.02`)
   - `asset`: `USDC`
   - `metadata`: `{ tool: <tool>, network: 'base-sepolia', mcp: 'p31-capital-machine' }`
5. The server also consumes entitlement (`POST {ENTITLEMENT_URL}/entitlement/consume`)
   so prepaid/billing tiers count against the caller.

## 5. Checklist

Pre-deploy:

- [ ] `tsc --noEmit` passes in `p31-capital-machine-mcp`.
- [ ] `wrangler deploy` succeeded and `GET /health` returns 200
      (`{"status":"ok","service":"p31-capital-machine-mcp","timestamp":...}`).
- [ ] `GET /.well-known/mcp` shows name, `0.1.0-beta`, all six tools,
      transport `streamable-http`.
- [ ] `GET /.well-known/mcp-pricing` shows `USDC`, `base-sepolia`, correct
      `pay_to`, and the three priced tools.

MCP contract:

- [ ] `POST /mcp` `initialize` returns `protocolVersion` `2025-06-18` and
      `serverInfo` `p31-capital-machine` / `0.1.0-beta`.
- [ ] `tools/list` returns all six tools with schemas.
- [ ] Free tools (`health`, `billing.listTiers`, `entitlement.check`) return 200
      without payment.
- [ ] Paid tools without payment return HTTP 402 with an `X-PAYMENT` header
      (scheme `exact`, correct `maxAmountRequired` in micro-units).
- [ ] Paid tools after x402 settlement return 200 with tool data proxied from the
      portal API.

Monetization:

- [ ] Settlement reaches `pay_to` on base-sepolia and a revenue ledger record with
      `source: x402` and matching `amount_usdc` is created.
- [ ] `entitlement.check` reflects the DID's tier before and after consumption.

Distribution:

- [ ] MCP registry PR submitted (Section 2.1) with name/url/tools/pricing.
- [ ] Bazaar resource registered (Section 2.2) via CDP API key, or
      `node scripts/register-mcp.mjs` run with `CDP_API_KEY` +
      `RESOURCES_REGISTRATION_URL`; re-run prints the payload and POSTs cleanly.
- [ ] Bedrock AgentCore MCP server associated (Section 2.3) with the same
      name/url/tools and a healthy import.
- [ ] `node scripts/register-mcp.mjs` exits 0 (CI-safe) when `CDP_API_KEY` is
      absent, printing the warning + health + metadata.
- [ ] No secrets (CDP API key, AWS keys) are logged anywhere in the process.

---

## 6. Coinbase Bazaar listing status (2026-09)

Verified state of the Coinbase Bazaar listing as of September 2026. This section
is a status snapshot, not a runbook; the runbook steps are in Section 2.2.

### 6.1 What is live and verified

- The MCP server is live at
  `https://p31-capital-machine-mcp.trimtab-signal.workers.dev` exposing 11 MCP
  tools over `POST /mcp` (JSON-RPC): paid `revenue.getSummary` ($0.02),
  `positions.list` ($0.01), `opportunities.scan` ($0.01),
  `allocator.rebalance` ($0.10, operator), `compounder.trigger` ($0.05,
  operator), `opportunities.execute` ($0.25, operator); free
  `entitlement.check`, `billing.listTiers`, `allocator.status`,
  `compounder.status`, `health`.
- Paid tools also exist as REST resources at `GET/POST /resources/:tool` (e.g.
  `/resources/revenue.getSummary`). An unpaid `GET` returns a real HTTP 402
  Payment Required challenge — verified live.
- The x402 route configs set `discoverable: true`, so the paid routes advertise
  themselves for Bazaar discovery.

### 6.2 CDP validate probe

The CDP validate endpoint confirms reachability and payment-gating:

```
POST https://api.cdp.coinbase.com/platform/v2/x402/validate
{ "resource": "<url>" }
```

Current result: **5 of 25 checks pass**. The passing checks confirm that the
resource is reachable over HTTPS and answers the x402 probe with a real HTTP
402 challenge (reachability / HTTPS / 402 behavior).

### 6.3 Remaining gap to full Bazaar indexing

**Updated 2026-09-25:** The facilitator secrets are now SET and the server is
deployed on the CDP Facilitator / Base mainnet (v `99b5675f`). The 402 challenge
now advertises `network: base` and `payTo: 0xF68f0a09b4cbC2D012B6BA01C787d3FFE4C47058`
(the P31 capital wallet), verified live. The `MEV_PRIVATE_KEY` / `PRIVATE_KEY_ETH`
secret is also set on the mev-arbitrage worker (key parses; a funded opportunity is
still required to execute an arbitrage).

What remains for full Bazaar indexing:

1. **CDP SDK wrapper** — wire `createX402Server` (or the Bazaar extension
   package) into the server so routes participate in the full Bazaar catalog
   protocol. The x402-hono v1 middleware emits a body-based `accepts` 402; the
   CDP validate probe additionally expects the v2 header + `extensions.bazaar`
   block that the wrapper produces. This is the remaining 20 of 25 checks.
2. **One real on-chain settle** — fund the wallet `0xF68f0a09…` with Base ETH
   for gas + USDC, complete at least one live settle through the CDP Facilitator,
   and confirm the resource appears in
   `GET /v2/x402/discovery/resources`.

Status: the server itself is live and correctly returns 402 challenges
(Section 6.1), and the validate probe passes the reachability/HTTPS/402 subset
(Section 6.2); full indexing awaits the CDP SDK wrapper plus the facilitator
secrets plus one real mainnet settle.