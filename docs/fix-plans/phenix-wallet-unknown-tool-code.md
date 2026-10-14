# fix (open): phenix-wallet-mcp unknown-tool error may need -32601 → -32602

<!-- P31-HEADER
id: p31_fix_plan_phenix_wallet_unknown_tool_code_20261011_v1.0
type: fix-plan
component: workers/phenix-wallet-mcp
status: resolved
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: will
-->

## Symptom

`workers/phenix-wallet-mcp/src/index.ts:533` — `tools/call` with an unknown tool
name answers `-32601`:

```ts
if (!tool) return corsResponse(JSON.stringify(mcpErr(id, -32601, `Unknown tool: ${params?.name}`)), 400);
```

2026-07-28 RC error-code renumbering reserves `-32601` for "method not found";
an unknown tool under `tools/call` should be `-32602` (invalid params), matching
the migrated workers (bros/dads/marketplace-mcp all answer `-32602`).

## Deferred

Do not edit in this pass — phenix-wallet-mcp is in the rewrite wave owned by
another agent. Verify after the rewrite lands:

1. grep `-32601` in `workers/phenix-wallet-mcp/src/index.ts` — the
   unknown-tool branch (:533) should be `-32602`; the unknown-method default
   (:554) should stay `-32601`.
2. If the rewrite kept `-32601` on the unknown-tool branch, apply the one-line
   swap and re-verify with `npx tsc --noEmit`.
## Resolution (2026-10-11)

Resolved by the SDK v2 swap (2026-10-11): the worker's dispatch is now
`@modelcontextprotocol/server` v2, whose handler reports unknown tools as
`-32602 Tool not found` internally — no hand-rolled code path remains.
