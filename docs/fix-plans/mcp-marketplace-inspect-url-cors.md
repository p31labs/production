# fix: inspect-any-URL depends on target CORS — add a registry /inspect proxy

<!-- P31-HEADER
id: p31_fix_plan_mcp_marketplace_inspect_url_cors_20261011_v1.0
type: fix-plan
component: workers/mcp-registry + portals/mcp-marketplace
status: open
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

Inspect-any-URL (B-2) probes external MCP endpoints with a client-side
stateless JSON-RPC handshake (initialize + tools/list, protocol
2026-07-28). That works only when the target server sends CORS headers
(`Access-Control-Allow-Origin`). P31's own workers do (`*`), but most
third-party MCP servers do not — those URLs degrade to "dead" with an
explicit network/CORS error instead of rendering a storefront.

## What the portal ships today

- src/lib/mcpWire.ts `probeExternalServer()` — stateless initialize +
  tools/list, JSON and SSE parsing, 12s timeout, per-step error detail.
- The InspectUrlPanel renders the degraded badge + error transcript (raw
  request/response), never crashes, and never invents tool data.

## Fix (registry)

Add an authenticated `POST /inspect` to workers/mcp-registry: accepts a URL,
runs the same stateless handshake server-side (no CORS restriction), returns
the probe result. The portal then calls `/inspect` first and falls back to
the direct client-side probe only when the registry is unreachable.

## Negative control

Dead URL → degraded badge + error detail (verified live against a
non-MCP URL). CORS-blocked URL → explicit "network/CORS blocked" detail in
the transcript, no crash, no fabricated storefront.