# fix: docs and /.well-known/mcp-servers.json over-claim MCP 2026-07-28 alignment (code still on old handshakes)

<!-- P31-HEADER
id: p31_fix_plan_mcp_protocol_status_overclaims_20261011_v1.0
type: fix-plan
component: docs
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`docs/OIS-DOSSIER.md`, `docs/X402_2026_FIELD_GUIDE.md`, `docs/MCP_LANDSCAPE_2026.md`,
and `workers/phosphorus31/src/index.ts` (`/.well-known/mcp-servers.json`) claimed that
all (or 10+) MCP servers speak the 2026-07-28 stateless protocol. The code does not
match: as of 2026-10-11 only design-mcp, the x402 bridge, and p31-mcp-server advertise
`2026-07-28`; bros, dads, marketplace-mcp, p31-justice-hub, p31-crypto-mcp,
phenix-wallet-mcp, p31-capital-machine-mcp, component-registry, and all 12 CLI bridge
backends still run pre-stateless handshakes.

## Verification (grep packets)

- Old handshake workers: `bros:388`, `dads:441`, `marketplace-mcp:440`, `justice-hub:422`, `phenix-wallet-mcp:476` → `2025-11-25`; `crypto-mcp:128` → `2024-11-05`; `capital-machine:642` → `2025-06-18`; `component-registry` worker → no `initialize` case (switch at `:93`, default `-32601`).
- Migrated: `design-mcp:141` (`PROTOCOL_VERSION = '2026-07-28'`, `server/discover` at `:1506`); `bridge/src/router.mjs:45`; `p31-mcp-server:15` (`createMcpHandler`).
- CLI: 8× `2024-11-05` (`mcp-server.js:306`, `component-registry.js:295`, `love-registry.js:130`, `phos-forge/mcp-server.mjs:684`, `cognitive-prosthetic.js:830`, `cognitive-comms.js:257`, `marge-server.js:765`, `bob-server.js:819`); 4× `2025-11-25` (`soulsafe-server.js:693`, `ground-truth-server.js:475`, `design-mcp-server.js:644`, `spaceship-server.js:371`).

## Resolution (2026-10-11)

1. `docs/OIS-DOSSIER.md` — replaced "all 12 servers aligned" (§2.1), "10+ servers all
   on 2026-07-28" (§3.4), "✅ Protocol version alignment (10+ servers)" (§7), and the
   ASCII diagram's `protocolVersion 2026-07-28` with a per-server status table plus a
   current-vs-target footnote.
2. `docs/X402_2026_FIELD_GUIDE.md` §3 — replaced "bridge and all 10 CLI servers now
   speak 2026-07-28" with target-spec framing plus a 13-row status table; noted that
   `upgraded: true` in serverInfo predates the migration.
3. `docs/MCP_LANDSCAPE_2026.md` — corrected the Executive Summary position and Key
   Takeaway 1 ("ahead of the curve" → "on the curve").
4. `workers/phosphorus31/src/index.ts:405-417` — catalog rows for bros, dads,
   marketplace-mcp, p31-justice-hub, p31-crypto-mcp, component-registry,
   phenix-wallet-mcp now carry the truthful advertised protocol (`2025-11-25`,
   `2024-11-05`, `null`) and `status: 'migrating'`; the aggregate `protocol` field
   reads `2026-07-28 (target — migration in progress)`.
5. Created the SSOT tracker `docs/enterprise/api/mcp-server-protocol-status.md`
   (per-server rows with file:line evidence), maintained by the migration coordinator.

## Open follow-ups (not part of this pass)

- `federation-bridge` and `ledger-bridge` rows in `mcp-servers.json` claimed
  `protocol: 2026-07-28` but neither file contains MCP JSON-RPC at all — they are not
  MCP servers. ✅ Resolved 2026-10-11 by
  `docs/fix-plans/false-mcp-members-relabel.md` (rows kept, relabeled).
- `workers/p31-crypto-mcp/smithery.yaml:7` and the `phenix-wallet-mcp` header comment
  still over-claim in their own files (out of scope for this pass; tracked in the
  status doc's drift table).