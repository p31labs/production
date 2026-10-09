<!-- P31-HEADER
id: p31_fix_plan_x402_gateway_20261004_v1.0
type: fix-plan
component: infra
status: open
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