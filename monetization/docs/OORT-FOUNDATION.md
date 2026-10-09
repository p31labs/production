# OORT Foundation Grant — P31 Capital Machine (DePIN Data + Storage)

**Amount:** $5K micro / $20–40K RFP / $40–100K open
**Status:** DRAFT — submit at oortfoundation.org

## Problem
DePIN operators generate two things that never get monetized as data: (1) device
telemetry that proves real-world coverage, and (2) the aggregate revenue
produced by that hardware. Neither is exposed to AI agents, and neither is
auditable by buyers.

## Solution
P31's contribution to the OORT ecosystem:
1. **Device-attested revenue as a data product.** Every DePIN payout lands in
   the hash-chained ledger with the device's did:key as payer/merchant. Any
   buyer can verify the payment on-chain and query it via the MCP server.
2. **OORT storage + x402 settlement.** Storage manifests recorded through OORT,
   settlement through x402 on Base — the two rails that make DePIN data
   discoverable to agents.
3. **A reference implementation** for any DePIN fleet operator: sink → ledger →
   MCP → OORT storage.

## Workplan
| Phase | Deliverable |
|---|---|
| 1 | Device DID attestation + signed contribution proofs |
| 2 | OORT storage manifests for the fleet's daily revenue rollups |
| 3 | MCP tools: `depin.deviceHistory`, `depin.attestations`, `depin.revenue` |
| 4 | Public reference dashboard (fleet → OORT → ledger → MCP) |
| 5 | Open-source the "DePIN → agent-accessible data" toolkit |

## Budget ($40,000 RFP tier)
Protocol work ($18,000) · OORT storage + testnet tooling ($6,000) ·
Reference dashboard ($8,000) · Open-source packaging ($5,000) · Community ($3,000).

## Evidence
- Live fleet: `revenue-sink/api/summary`
- Hash-chained provenance: `/revenue/verify-chain` → `valid:true`
- Agent interface: `p31-capital-machine-mcp` (11 tools)