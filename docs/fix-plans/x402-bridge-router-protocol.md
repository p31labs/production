# fix: x402 bridge router lacks stateless discover/resultType/_meta on the 2026-07-28 path

<!-- P31-HEADER
id: p31_fix_plan_x402_bridge_router_protocol_20261011_v1.0
type: fix-plan
component: workers/mcp-x402-gateway/bridge
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

The bridge (`workers/mcp-x402-gateway/bridge/src/router.mjs`,
`bridge/src/index.mjs`, `bridge/src/stdio-client.mjs`) is the front door for paid
gateway calls but its 2026-07-28 surface is incomplete:

- no `server/discover` on the main path;
- results carry no `resultType` (SEP-2322);
- `tools/list` carries no `ttlMs`/`cacheScope` (SEP-2549);
- responses carry no namespaced `_meta` envelope;
- `initialize` (router.mjs:40-50) is the only handshake — the deployed gateway
  worker and stdio-client still send it, and the 16/16 health gate depends on it.

## Resolution (2026-10-11)

1. Added `server/discover` (protocolVersion, capabilities, serverInfo),
   `resultType: 'complete'` on all results, `ttlMs` + `cacheScope` on
   `tools/list`, and a namespaced `_meta` envelope
   (`io.modelcontextprotocol/protocolVersion` + `io.modelcontextprotocol/serverInfo`)
   to router.mjs.
2. KEPT the legacy `initialize` shape (router.mjs:40-50) working — now marked
   `// Deprecated legacy-compat branch (pre-SEP-2575)` — because the deployed
   gateway worker, stdio-client, and the 16/16 health gate still send initialize.
   Deprecation markers are filed here; cbs-verify enforcement untouched
   (bridge/src/cbs-verify.mjs, index.mjs:40-58 403 logic).
3. stdio-client.mjs `_initialize` (:84-92) and `_batchRequest` (:147) now try
   `server/discover` first and fall back to `initialize` when the backend answers
   with a legacy shape (or does not speak discover).
4. Verified: `sudo systemctl restart p31-mcp-bridge`,
   `curl https://mcp-x402-bridge.p31ca.org/health` → 200,
   `node /home/p31/production/scripts/cbs-settlement-smoke.mjs` legs A/B pass
   (leg C skipped — needs the gateway worker deploy, out of scope for this pass).