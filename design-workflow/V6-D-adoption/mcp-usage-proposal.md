<!-- P31-HEADER
id: p31_v6_d1_mcp_usage_proposal_20261011_v1.0
type: contribution-proposal (design-core) — NEVER APPLIED IN PLACE
component: design-workflow/V6-D-adoption
status: queued (lands with the design-core PR)
retention: keep-forever
created: 2026-10-11T00:00:00Z
owner: lane-d-v6
-->

# D-1 Proposal — Per-Isolate MCP Usage Counters (design-core)

**Authority note:** This is a PROPOSAL FILE, not an edit. Per design-core
`AGENTS.md` mistake #10, any change to `packages/design-core` is a
contribution proposal that lands via PR — never a fix in place. Nothing in
canon was modified to produce this document. The instrumented usage log below
is a spec + diff sketch for the design-core PR (queued; see D-REPORT.md).

**Target file (read-only reference):**
`production/packages/design-core/src/mcp/http-worker.ts` — the existing
per-isolate token-bucket rate limiter lives at lines 39–53:

```ts
39: const RATE_WINDOW_MS = 60_000;
40: const RATE_MAX_TOKENS = 60;
41: const rateBuckets = new Map<string, { tokens: number; reset: number }>();
42:
43: function allowRate(ip: string): boolean {
44:   const now = Date.now();
45:   const bucket = rateBuckets.get(ip);
46:   if (!bucket || now > bucket.reset) {
47:     rateBuckets.set(ip, { tokens: RATE_MAX_TOKENS - 1, reset: now + RATE_WINDOW_MS });
48:     return true;
49:   }
50:   if (bucket.tokens <= 0) return false;
51:   bucket.tokens--;
52:   return true;
53: }
```

## 1. Motivation (runbook §7 D-1, MEASURE-TO-ADOPT RULE #23)

"Built" is a milestone; "used" is the metric. The worker currently counts
nothing except the rate limiter's per-IP tokens, which are intentionally
stateless-ish and thrown away. The cheapest honest instrument is a
per-isolate in-memory counter appended to the block above — same lifetime,
same no-KV constraint, zero external bindings.

## 2. Proposed shape (appended to http-worker.ts:39-53)

```ts
// ─── Usage counters (per-isolate, no external state — D-1 proposal) ──────
interface UsageCounter {
  startedAt: number;               // isolate epoch ms
  requests: number;                // /mcp POSTs accepted (past rate limit)
  rateLimited: number;             // requests refused by allowRate()
  parseErrors: number;             // JSON parse failures
  calls: Map<string, number>;      // tool name → successful tool calls
  errors: Map<string, number>;     // tool name → error/throw tool calls
}

const usage: UsageCounter = {
  startedAt: Date.now(),
  requests: 0,
  rateLimited: 0,
  parseErrors: 0,
  calls: new Map(),
  errors: new Map(),
};

function bump(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function recordUsage(tool: string, ok: boolean): void {
  bump(ok ? usage.calls : usage.errors, tool);
}
```

### Wire points (exact sites in the existing fetch/handler flow)

| Site | Existing line | Change |
|---|---|---|
| rate-limit refusal | `:179` (`if (!allowRate(ip))`) | `usage.rateLimited++` inside the branch |
| parse failure | `:288` (`return jsonResponse(... 400)`) | `usage.parseErrors++` before the return |
| dispatch | `:302` (`handleMcpRequest(body, requestId)`) | `usage.requests++`; inside `handleMcpRequest`, at `:132` after `handleToolCall` and in the catch at `:150`, call `recordUsage(params.name, ok)` |

### New route — `GET /usage`

Returns a snapshot in the aggregated shape (the same shape the local
stand-in `usage-logger.mjs` prints):

```json
{
  "service": "p31-design-mcp",
  "startedAt": "2026-10-11T00:00:00.000Z",
  "requests": 150,
  "rateLimited": 2,
  "parseErrors": 0,
  "tools": [
    { "name": "list_tokens",    "calls": 120, "errors": 2 },
    { "name": "resolve_token",  "calls": 45,  "errors": 0 }
  ]
}
```

Placed before the 404 fallthrough in `fetch` (near `:307`), mirroring the
`/health` handler style at `:195`.

### Per-call log record (optional JSONL emit)

If a KV/D1 binding arrives later, emit one JSONL record per call —
**no raw IPs** (PII-free; drop or hash `CF-Connecting-IP`):

```json
{"t":"usage","iso":"2026-10-11T00:00:00.000Z","tool":"resolve_token","ok":true,"ms":3}
```

## 3. Non-goals (honesty boundaries)

- **No cross-isolate aggregation.** Cloudflare isolates are ephemeral; a real
  dashboard needs a KV/D1 binding + a second worker. This proposal only
  upgrades "we can't see any usage" to "every isolate can report its own
  window" — a stepping stone, clearly labeled.
- **No PII.** No raw IP, no user agent, no request body capture. Usage counts
  only.
- **No timing precision.** Wall-clock `Date.now()` per isolate; enough for
  trends, not for latency SLOs.
- **No rate-limiter rework.** The counter is additive to the block at 39-53;
  the bucket logic stays byte-identical.

## 4. Negative controls (a gate must be able to fail)

1. **Counter miss:** call `resolve_token`, then assert `GET /usage` shows
   `calls >= 1` — if the recorder is not wired, the test fails.
2. **Rate-limited calls are counted:** exceed 60 req/60s from one origin;
   assert `rateLimited > 0` AND the 429 body is unchanged.
3. **Error accounting:** call `tools/call` with an unknown tool name; assert
   `errors >= 1` while `calls` is unchanged.

## 5. Status

- Local stand-in (rehearsal-grade): `V6-D-adoption/usage-logger.mjs` — a
  counter harness wrapping JSON-RPC calls to the local worker. **Not** the
  production instrumentation.
- Queued with the design-core PR. Re-running the stand-in after the PR lands
  and after the canon deploy is the drift check (runbook §7 D-2).