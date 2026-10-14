# fix: federation-bridge and ledger-bridge relabeled from false MCP members to real roles

<!-- P31-HEADER
id: p31_fix_plan_false_mcp_members_relabel_20261011_v1.0
type: fix-plan
component: docs
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/phosphorus31/src/index.ts` (`/.well-known/mcp-servers.json`) listed
federation-bridge and ledger-bridge as MCP servers with `protocol: '2026-07-28'`
and fabricated tool counts (18 and 8). Neither worker contains any MCP JSON-RPC —
they are integration services, not MCP servers. This was the open follow-up from
`docs/fix-plans/mcp-protocol-status-overclaims.md`.

## Verification (grep packets)

- `workers/federation-bridge/src/index.ts:1-16` — Hono app header comment:
  "ActivityPub Federation Bridge … Federates care attestations (SD-JWT VCs) to
  the Fediverse. Implements ActivityPub Application actor, inbox/outbox, and
  HTTP Signatures." No MCP surface.
- `workers/ledger-bridge/src/index.ts:1-18` — header comment: "off-chain →
  on-chain attestation relay (Path A) … POST /anchor + /anchor-batch →
  P31TransparencyAnchor … POST /care-proof → ProofOfCare." No MCP surface.
- Grep for `initialize|tools/list|server/discover|jsonrpc|McpServer|createMcpHandler`
  in `workers/federation-bridge/src` and `workers/ledger-bridge/src`: **0 matches**
  in both.
- Repo-wide sweep for other files pairing these names with MCP protocol labels
  (`(federation|ledger)-bridge.{0,100}(mcp|protocol)`): no other file claims an
  MCP protocol version for them. `docs/OIS-DOSSIER.md`, `docs/MCP_LANDSCAPE_2026.md`,
  `docs/X402_2026_FIELD_GUIDE.md`, `shell/MASTER_CONNECTION_PLAN.md` either do not
  list them as MCP servers or list them truthfully (HTTP fetch rows, RFC 9901 /
  X-Wing protocol rows).

## Resolution (2026-10-11)

Decision locked by owner: relabel to real role, **do not remove rows**.

1. `workers/phosphorus31/src/index.ts:406` — before:
   `{ name: 'federation-bridge', url: 'https://federation.p31ca.org', tools: 18, protocol: '2026-07-28', status: 'production' }`
   after:
   `{ name: 'federation-bridge', url: 'https://federation.p31ca.org', role: 'verification relay (not MCP)', protocol: 'n/a — not an MCP server', status: 'production' }`
2. `workers/phosphorus31/src/index.ts:407` — before:
   `{ name: 'ledger-bridge', url: 'https://ledger-bridge.trimtab-signal.workers.dev', tools: 8, protocol: '2026-07-28', status: 'production' }`
   after:
   `{ name: 'ledger-bridge', url: 'https://ledger-bridge.trimtab-signal.workers.dev', role: 'ledger bridge (not MCP)', protocol: 'n/a — not an MCP server', status: 'production' }`
3. `total_tools` 108 → 82 (fabricated 18 + 8 MCP tool counts removed with the relabel).
4. `docs/enterprise/api/mcp-server-protocol-status.md` — new clearly-marked
   subsection "## Not MCP servers (removed from protocol tracking)" with one row
   per bridge (actual role + evidence file:line); drift-table row updated to
   record the relabel.
5. `docs/fix-plans/mcp-protocol-status-overclaims.md` — open follow-up marked
   resolved, pointing here.

## Files changed

- `workers/phosphorus31/src/index.ts` (catalog rows `:406-407`, `total_tools`)
- `docs/enterprise/api/mcp-server-protocol-status.md` (new subsection + drift row)
- `docs/fix-plans/mcp-protocol-status-overclaims.md` (follow-up → resolved)
- `docs/fix-plans/false-mcp-members-relabel.md` (this plan)

## Out-of-scope observation (for the migration coordinator, not this pass)

`workers/phosphorus31/src/index.ts:369-376` (`/llms.txt`) still lists both bridges
under a "## Available MCP Endpoints" heading. That block is outside the catalog-row
scope of this pass; the catalog and the protocol-status SSOT are now truthful.