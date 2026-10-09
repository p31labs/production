# IoTeX Halo Grant — P31 Capital Machine (DePIN Fleet)

**Amount:** up to $2,000 USDT (PoC tier) · DePIN Incubator track
**Status:** DRAFT — submit at iotex.io/halo

## Problem
Consumer DePIN revenue is fragmented across 14+ apps (Honeygain, Pawns, EarnApp,
PacketStream, Storj, Grass, NodePay, Render, Clore…). Operators have no unified
ledger, no provenance, no way to prove a device is contributing — and no way to
monetize idle hardware through agent-native rails.

## Solution
P31 Capital Machine + the cashpilot DePIN fleet:
- **Revenue Sink** (`revenue-sink.trimtab-signal.workers.dev`) — one authenticated
  endpoint, one hash-chained ledger, every DePIN app's payout typed and auditable.
- **cashpilot** — the fleet runtime: 3-node Ansible inventory, money4band Docker
  stack, per-app credentials in `unified.env`.
- **x402 MCP server** — the fleet's aggregate revenue exposed as a paid agent tool
  (revenue.getSummary, positions.list) on Base mainnet.

## The IoTeX fit
IoTeX is the DePIN-native L1. P31's fleet is DePIN-native at the hardware layer
and x402-native at the settlement layer — the combination IoTeX's Halo grant
exists to fund. The PoC demonstrates: a multi-app DePIN fleet → one hash-chained
revenue ledger → one x402-settled agent interface.

## 6-month PoC
| Month | Deliverable |
|---|---|
| 1 | Onboard Storj (2TB configured) + Honeygain + Pawns to the sink |
| 2 | Hardware attestation: device → did:key identity, signed contribution proofs |
| 3 | Multi-device fleet dashboard (public, hash-chained) |
| 4 | x402 expose: `depin.revenue(device)` as a paid MCP tool |
| 5 | IoTeX testnet settlement rail (ioPay + W3bstream attestation) |
| 6 | Open-source the fleet-onboarding toolkit |

## Budget ($2,000)
Storj device ($150) · Node hardware consumables ($400) · IoTeX testnet tooling ($300) ·
Documentation + open-source packaging ($500) · Community workshop ($400) ·
Misc ($250).

## Evidence
- Revenue Sink: `https://revenue-sink.trimtab-signal.workers.dev/api/summary`
- Hash-chained ledger: `https://revenue-ledger.trimtab-signal.workers.dev/revenue/verify-chain` → `valid:true`
- x402 MCP server: `https://p31-capital-machine-mcp.trimtab-signal.workers.dev`
- Fleet: `cashpilot/ansible/inventory/hosts.yml` (3 nodes)