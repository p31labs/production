<!-- P31-HEADER
id: p31_mcp_server_protocol_status_20261011_v1.1
type: research
component: mcp
status: live
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

# MCP Server Protocol Status — final wave state (2026-10-11)

**This table is the SSOT for which MCP server speaks which protocol. Do not
trust prose in other docs; trust this table plus the code it cites.**

**Wave status:** COMPLETE — all 26 servers migrated (stateless 2026-07-28,
SDK v2 where applicable, OAuth 2.1 on the public HTTP surface).
**Tracker:** `/home/p31/production/docs/MCP_MIGRATION_2026-07-28.md`
(coordinator-maintained; static findings superseded by this file).
**Target reached:** every server advertises `2026-07-28` (SEP-2575
stateless), `server/discover` implemented, legacy `initialize` kept only in
deprecated compat branches.

Legend: ✅ migrated · ⛔ source-done, deploy-blocked · ⚪ n/a by design.

---

## Workers (edge)

| Server | Protocol | Stateless / discover | SDK v2 | OAuth 2.1 | Status |
|---|---|---|---|---|---|
| p31-design-mcp | `2026-07-28` | ✅ / ✅ | ✅ (38 tools, 85/85 tests) | — | ✅ deployed |
| x402 bridge (router) | `2026-07-28` | ✅ / ✅ | — (hand-rolled proxy) | — | ✅ live |
| p31-mcp-server | SDK-managed | ✅ / ✅ | ✅ (`@modelcontextprotocol/server` v2) | — | ✅ |
| bros | `2026-07-28` | ✅ / ✅ | ✅ | ✅ (8414/9728/8707/iss) | ✅ deployed |
| dads | `2026-07-28` | ✅ / ✅ | ✅ | ✅ | ✅ deployed |
| p31-justice-hub | `2026-07-28` | ✅ / ✅ | ✅ | ✅ | ✅ deployed |
| p31-crypto-mcp | `2026-07-28` | ✅ / ✅ | ✅ | ✅ | ✅ deployed |
| phenix-wallet-mcp | `2026-07-28` | ✅ / ✅ | ✅ | ✅ | ✅ deployed |
| p31-capital-machine-mcp | `2026-07-28` | ✅ / ✅ | ✅ | ✅ (+ `iss` fix) | ✅ deployed |
| marketplace-mcp | `2026-07-28` | ✅ / ✅ | ✅ | ✅ (opt-in; offer mutations gated) | ✅ deployed |
| component-registry | `2026-07-28` | ✅ / ✅ | ✅ (incl. `design_spoon_guide` fix) | — | ✅ deployed |
| mcp-registry | `2026-07-28` | ✅ / ✅ | ✅ (server + v2 client probes) | ✅ | ✅ deployed (75/75) |
| mcp-x402-gateway | `2026-07-28` | ✅ / ✅ | — (proxy) | ✅ source | ⛔ deploy blocked (Secrets Store scope, owner token) |
| oauth-relay | n/a (AS) | ⚪ | ⚪ | ✅ (8414/9728/8707/9207/CIMD) | ✅ deployed |

## CLI stdio servers (12 bridge backends + parity)

All 12 bridge backends + `design-parity`: stateless ✅ + SDK v2
(`serveStdio`) ✅. OAuth ⚪ (local stdio).

| Server | Protocol | SDK v2 | Status |
|---|---|---|---|
| bob, marge, oasis, ground-truth, soulsafe, spaceship, love-registry, cognitive-prosthetic, cognitive-comms, design-mcp-server, component-registry (CLI), phos-forge | `2026-07-28` (legacy `initialize` compat kept) | ✅ (`@modelcontextprotocol/server` v2, byte-identical tool surfaces) | ✅ live-verified stdio probes |
| design-parity (parity-server.mjs) | `2026-07-28` | — (hand-rolled stateless; `design-parity-sdk-v2-remainder.md` filed) | ✅ live-verified |

## Out-of-wave notes

- `federation-bridge` / `ledger-bridge`: NOT MCP servers (relabeled
  2026-10-11; see `docs/fix-plans/false-mcp-members-relabel.md`).
- `apps/gateway` proxy: edge `2026-07-28` (fronts migrated backends).
- Legacy `initialize` branches remain ONLY as deprecated compat paths; no
  `ping`, `logging/setLevel`, `Mcp-Session-Id`, `resources/subscribe`, or
  legacy error codes remain on any main path (read-only conformance sweep,
  2026-10-11).