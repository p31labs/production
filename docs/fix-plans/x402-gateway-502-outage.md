<!-- P31-HEADER
id: p31_fix_plan_x402_gateway_20261004_v1.0
type: fix-plan
component: infra
status: resolved
retention: archive-90d
created: 2026-10-04T00:00:00Z
owner: will
-->

# fix-plan: x402-gateway 502 outage

**Discovered by:** agent:worker:mcp-health-gate
**Discovered at:** 2026-10-04T00:00:00Z
**Severity:** high

## The bug

`mcp-x402-gateway.trimtab-signal.workers.dev/mcp` returns HTTP 502 on a
JSON-RPC initialize POST (and 404 on GET). The remote MCP server is unreachable
for tool calls. The old GET-based health probe (`r.status < 500`) masked this
outage by reporting the server "healthy" — the 404 GET passed the weak check.
The corrected JSON-RPC POST probe (`scripts/mcp-health-check.mjs`) now honestly
flags `x402-gateway` as UNHEALTHY.

## Evidence

```
$ curl -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{...}}' \
  https://mcp-x402-gateway.trimtab-signal.workers.dev/mcp
error code: 502
HTTP 502
```

Reproduced 3/3 times (persistent, not transient).

## The fix

- **Infra owner:** investigate the `mcp-x402-gateway` Cloudflare Worker —
  check the D1/KV bindings and the `toolName`/`maxAmount` request path in the
  worker's `x402_request` handler. A 502 on initialize suggests the Worker
  throws before returning the MCP handshake (missing binding, code error, or
  the gateway is not deployed to the `trimtab-signal` account).
- **Gate behavior (already applied):** the JSON-RPC POST probe stays. When the
  server recovers, `pnpm mcp:health` will report all 16 healthy. Until then the
  gate honestly reports the outage.

## Acceptance

`pnpm mcp:health` reports `HEALTHY x402-gateway` via the JSON-RPC POST probe.

## Reopen if

The 502 persists for more than 24h — escalate to the deploy owner (wrangler
deploy of the gateway worker).

## Resolution (2026-10-11)

**Root cause (not the Worker):** the gateway is healthy. `GET /health` on the
gateway returns 200; its `/mcp` handler proxies to
`BRIDGE_URL = https://mcp-x402-bridge.p31ca.org/mcp`, and a failed upstream
fetch returns 502 "Bridge service unavailable". The **origin** behind
`mcp-x402-bridge.p31ca.org` (cloudflared tunnel `e9c35f32` →
`http://localhost:8788`) was dead.

The bridge is a Node service supervised by
`/etc/systemd/system/p31-mcp-bridge.service`. Its `WorkingDirectory` and
`StandardOutput` pointed at the *stale* repo path
`/home/p31/P31-local-workspace/workers/mcp-x402-gateway/bridge`, which no longer
exists (repo moved to `/home/p31/production`). systemd therefore failed every
start with `status=209/STDOUT` (cannot open the append log), so the bridge never
listened on `:8788` and cloudflared returned 502.

**Fix applied:**
1. Repointed `WorkingDirectory` and `StandardOutput` in the unit to
   `/home/p31/production/workers/mcp-x402-gateway/bridge`.
2. `systemctl daemon-reload && systemctl restart p31-mcp-bridge`.

**Verification:**
- `systemctl is-active p31-mcp-bridge` → `active`; `:8788` listening.
- `https://mcp-x402-bridge.p31ca.org/health` → 200 (177 tools, 12/12 backends).
- `POST https://mcp-x402-gateway.trimtab-signal.workers.dev/mcp` initialize →
  200 (`serverInfo: p31-mcp-x402-bridge`).
- `node scripts/mcp-health-check.mjs` → **16/16 servers healthy**.

**Follow-up:** the unit is enabled but the bridge is a host-local Node process
dependent on the tunnel + `:8788`; a host reboot restarts it via systemd, but the
train of failure (stale path after a repo move) should be caught by a deploy
smoke test — see the `mcp:health` gate.