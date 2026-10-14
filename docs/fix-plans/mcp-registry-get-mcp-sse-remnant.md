# fix (open): mcp-registry GET /mcp still serves a legacy SSE remnant

<!-- P31-HEADER
id: p31_fix_plan_mcp_registry_get_mcp_sse_remnant_20261011_v1.0
type: fix-plan
component: workers/mcp-registry
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/mcp-registry/src/index.ts:2141-2143` — `GET /mcp` returns a hardcoded
legacy SSE stream:

```ts
if (url.pathname === '/mcp' && request.method === 'GET') {
  return new Response('event: endpoint\ndata: {"mcp":"p31-mcp-marketplace"}\n\n', { headers: { 'Content-Type': 'text/event-stream', ...corsHeaders() } });
}
```

The stateless 2026-07-28 workers serve JSON metadata on `GET /mcp` instead
(pattern: `workers/bros/src/index.ts` GET /mcp → `{ service, transport,
protocol, mcp: 'POST /mcp', tools: [...] }`). The SSE `event: endpoint` frame is
also stale: it claims `p31-mcp-marketplace`, not the registry's own name.

## Deferred

This file is being rewritten by another agent right now — do not edit it in this
pass. The exact fix, to apply after the rewrite lands:

Replace the SSE Response with the stateless JSON metadata shape, e.g.:

```ts
if (url.pathname === '/mcp' && request.method === 'GET') {
  return new Response(JSON.stringify({
    service: 'p31-mcp-registry',
    transport: 'streamable-http',
    protocol: PROTOCOL_VERSION,
    mcp: 'POST /mcp',
    tools: <registry tool names>,
  }), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
}
```

Keep `POST /mcp` (handleMcpSurface) untouched.
## Resolution (2026-10-11)

GET /mcp now returns stateless endpoint-metadata JSON (service/transport/
protocol/mcp/tools) instead of the `event: endpoint` SSE frame
(`src/index.ts` GET /mcp branch). `tsc --noEmit` green; vitest 75/75.
