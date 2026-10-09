<!-- P31-HEADER
id: p31_wave_11_observability_20261007_v1.0
type: runbook
component: shell
status: live
retention: keep-forever
created: 2026-10-07T00:00:00Z
owner: will
-->

# Wave 11 — Observability (OTel GenAI)

## Scope note (the honest line)

Waves 1–10 are built and green (16 feature gates, vitest 108/108, e2e 15/15).
Wave 11 is the observability tier — the last planned wave. Two things land:

- **11a — The span contract.** The `gen_ai.*` attributes, the span tree, the
  five-way token split, the prompt version, the ledger's `traceId`.
- **11b — The pipeline.** Cloudflare native tracing in both Workers, the
  destination, the sampling, the collector-side redaction, the two-store
  separation.

Wave 11 opens with a Phase 0 that closes three Wave 10 review defects:

1. **Three behavioural harnesses remain unbuilt.** The compliance tamper path is
   gate-asserted but never exercised; Phase 0a adds it, because an export that
   lies about integrity is the exact failure Article 50's provenance rule exists
   to prevent.
2. **`resolveKey` returns the plaintext, but the turn does not route it.**
   Verified: `resolveKey(...): Promise<{ key, fingerprint } | null>`
   (credentials.ts:44,60). `stream.ts` reads `cred?.fingerprint` for attribution
   but the turn runs the keyless Workers AI binding — BYOK is audit-only. Named
   and filed, not silently built upon.
3. **`otel.ts` is the foundation, not a greenfield.** Verified this turn: it sets
   `trace_id = sessionId`, maps `agent.*` to `gen_ai.agent.name`, maps
   `model.usage` to the legacy `gen_ai.usage.cached_tokens`, and sets `session.id`
   — but it has no `gen_ai.conversation.id`, no `gen_ai.operation.name`, no
   prompt version, and no semconv pin. Wave 11 extends it.

Wave 11's dependency is the strongest of the eleven: it reads every event the
prior waves emit. It cannot be built against a stub ledger.

**Explicitly not in this wave:** alerting and SLOs, the eval-score stream, a
self-hosted collector, and the BYOK provider-routing seam (named in Phase 0b,
filed, not built here).

## Preconditions (deterministic, abort-fast)

```bash
node scripts/gate.mjs --feature collaboration      # 11/11
node scripts/gate.mjs --feature compliance         # 6/6
node scripts/gate.mjs --feature streaming-protocol # 6/6
node scripts/gate.mjs --feature tool-protocol      # 9/9
npm --prefix portals/shell run typecheck           # exit 0
```

## Phase 0 — close the Wave 10 review defects

### 0a — The tamper-detection behavioural test

Add a `compliance.spec.ts` case: mutate one `bus_events` row's `payload_json`,
run `GET /api/audit/verify?from=&to=`, assert `valid: false`; then `GET
/api/audit/export`, assert the manifest's `integrity_status` is `FAILED`. An
export that claims VERIFIED on a broken chain is evidence that lies.

### 0b — Name the BYOK routing gap

File `docs/fix-plans/byok-routing-gap.md` (status open): `resolveKey` returns
the plaintext, but `stream.ts` runs the keyless Workers AI binding and never
passes `cred.key` to a provider. BYOK is attribution-only. The fix is provider
routing — deferred, not a gate gap. Do not build the span tree on top of a
decorative feature without naming this.

### 0c — Confirm `otel.ts` is the foundation

Read `src/shell/otel.ts`. Confirm three properties are kept: `trace_id =
sessionId` (deterministic), the map is deterministic, and a failed export is
swallowed (`neverBlock`). The Wave 11 work is additive.

## Phase 1 — the span contract (11a)

### 1a — The attributes (`src/shell/otel.ts`, extended)

```ts
/** The GenAI semconv version this build targets. v1.41.0 (2026-04-28)
 *  introduced a breaking execute_tool span-naming change requiring the tool
 *  name — the pin is mandatory, not decorative. */
export const GENAI_SEMCONV_VERSION = '1.41.0';

export const ATTR = {
  CONVERSATION_ID: 'gen_ai.conversation.id',
  AGENT_NAME: 'gen_ai.agent.name',
  AGENT_ID: 'gen_ai.agent.id',
  OPERATION_NAME: 'gen_ai.operation.name',
  REQUEST_MODEL: 'gen_ai.request.model',
  PROMPT_VERSION: 'gen_ai.prompt.version',
  TOOL_NAME: 'gen_ai.tool.name',
  TOOL_CALL_ID: 'gen_ai.tool.call.id',
  USAGE_INPUT: 'gen_ai.usage.input_tokens',
  USAGE_OUTPUT: 'gen_ai.usage.output_tokens',
  USAGE_CACHE_READ: 'gen_ai.usage.cache_read.input_tokens',
  USAGE_CACHE_CREATION: 'gen_ai.usage.cache_creation.input_tokens',
  USAGE_REASONING: 'gen_ai.usage.reasoning.output_tokens',
} as const;

/** The fixed agent id — never a per-instance id, never the event's label. */
export const AGENT_NAME = 'p31-shell';
```

### 1b — The token normalization (the #1 bug class)

The two wire conventions disagree: one reports input excluding cached tokens
(additive), the other includes them (inclusive). Normalize once, at the
boundary, into disjoint counts. `model.usage` gains `cache_creation_tokens` and
`reasoning_tokens` additively.

### 1c — The span tree (`src/shell/otelSpanTree.ts`, new)

One `invoke_agent` per turn; Phase 1 and Phase 2 are `chat` siblings; each tool
call is an `execute_tool` sibling. The model span ends before a requested tool
runs, so model latency excludes tool time. Span names derive from identifiers
(`invoke_agent ${AGENT_NAME}`, `chat ${CHAT_MODEL}`, `execute_tool
${toolName}`), never display labels. `CHAT_MODEL` already exists in
`stream.ts`; the prompt version is derived from `sha256(SYSTEM_PROMPT).slice(0,
12)` plus a semver tag in a comment — a hand-maintained version drifts.

### 1d — The ledger `traceId`

`functions/_lib/ledger.ts` — `traceId?: string` on the append meta; the SQL
column is `trace_id` (nullable). The append path treats a missing trace as a
valid row. `rowToEvent` stamps it back.

## Phase 2 — the pipeline (11b)

### 2a — Native tracing, both Workers

```toml
[observability.traces]
enabled = true
```

in **both** `portals/shell/wrangler.toml` and `portals/shell/room/wrangler.toml`.
A single file leaves the DO a blind spot — Cloudflare follows RPC into a
Durable Object automatically once tracing is enabled on both sides.

### 2b — The sampling decision

`functions/_lib/telemetry.ts` — errors are never sampled; successes are. Tail
sampling keeps the long tail a debugging session is actually about.

### 2c — The collector-side redaction

Document the collector config (a transform processor scrubbing `gen_ai.prompt`,
`gen_ai.completion`, and tool arguments before storage). The app emits content;
the collector redacts. `disable_content_logging` for regulated deployments.

## The gate

```bash
node scripts/gate.mjs --feature observability
node scripts/gate.mjs --feature telemetry-pipeline
npx playwright test tests/e2e/
```

Structural assertions (the precondition): `gen_ai.conversation.id` on every
agent span; `gen_ai.operation.name` distinguishes the tree; the semconv version
is pinned; the five-way split is present; the prompt version is on the model
span; the ledger carries `traceId` additively and nullable; the span tree is
`invoke_agent` with `chat`/`execute_tool` siblings; both wrangler files enable
traces; no SDK is imported; the metrics constraint is documented; errors are
never sampled; the app does not redact.

Behavioural assertions (the gate): a turn produces one `invoke_agent` span with
two `chat` and N `execute_tool` children; every child carries the conversation
id; the chain verifies with the trace store disabled; a tampered row fails
verification (Phase 0a).

## Negative controls (plant, grep the needle, prove it fails, `cp` restore)

```bash
mkdir -p /tmp/opencode/nc

# 1 — the conversation id is dropped (orphan spans)
cp portals/shell/src/shell/otel.ts /tmp/opencode/nc/otel.ts.bak
sed -i 's/gen_ai\.conversation\.id/x_orphan_span/' portals/shell/src/shell/otel.ts
grep -n 'x_orphan_span' portals/shell/src/shell/otel.ts   # MUST show the plant
node scripts/gate.mjs --feature observability --quick   # MUST exit 1
cp /tmp/opencode/nc/otel.ts.bak portals/shell/src/shell/otel.ts

# 2 — the span tree flattens (chat/execute_tool lose the conversation id)
cp portals/shell/src/shell/otelSpanTree.ts /tmp/opencode/nc/otelSpanTree.ts.bak
sed -i 's/\[ATTR.CONVERSATION_ID\]: sessionId,//' portals/shell/src/shell/otelSpanTree.ts
grep -c 'ATTR.CONVERSATION_ID' portals/shell/src/shell/otelSpanTree.ts   # MUST drop
node scripts/gate.mjs --feature observability --quick   # MUST exit 1
cp /tmp/opencode/nc/otelSpanTree.ts.bak portals/shell/src/shell/otelSpanTree.ts

# 3 — the trace store becomes required (the chain breaks without it)
cp portals/shell/functions/_lib/ledger.ts /tmp/opencode/nc/ledger.ts.bak
sed -i 's/traceId?: string/traceId: string/' portals/shell/functions/_lib/ledger.ts
grep -n 'traceId: string' portals/shell/functions/_lib/ledger.ts   # MUST show the plant
node scripts/gate.mjs --feature observability --quick   # MUST exit 1
cp /tmp/opencode/nc/ledger.ts.bak portals/shell/functions/_lib/ledger.ts

# 4 — the room Worker's tracing is disabled (the DO blind spot)
cp portals/shell/room/wrangler.toml /tmp/opencode/nc/room-wrangler.toml.bak
sed -i 's/enabled = true/enabled = false/' portals/shell/room/wrangler.toml
grep -n 'enabled = false' portals/shell/room/wrangler.toml   # MUST show the plant
node scripts/gate.mjs --feature telemetry-pipeline --quick   # MUST exit 1
cp /tmp/opencode/nc/room-wrangler.toml.bak portals/shell/room/wrangler.toml
```

Control 1 is the orphan span. Control 2 is the flat span tree. Control 3 is the
audit that requires telemetry. Control 4 is the DO blind spot.

## Decision log

| Decision | Basis | Recorded in |
|---|---|---|
| `gen_ai.conversation.id = sessionId` | the three-attribute rule; `session.id` is supplemented | observability.md |
| The agent name is a fixed config id | an in-memory instance id is transient | observability.md |
| `invoke_agent` with `chat`/`execute_tool` siblings | model latency must not include tool time | observability.md |
| Span names derive from identifiers | aggregations break on rename | observability.md |
| The five-way split normalizes once at the boundary | the additive-vs-inclusive disagreement is the #1 bug class | observability.md |
| The ledger carries `traceId`, additively, best-effort | audit must not depend on telemetry | observability.md |
| Cloudflare native tracing, no SDK | `sdk-node` is not supported on Workers | telemetry-pipeline.md |
| The metrics constraint is named first | Cloudflare exports traces and logs only | telemetry-pipeline.md |
| Errors are never sampled | tail sampling keeps the long tail | telemetry-pipeline.md |
| Redaction is collector-side | the transform processor runs before storage | telemetry-pipeline.md |
| Both wrangler files enable traces | the DO is otherwise a blind spot | telemetry-pipeline.md |
| The semconv version is pinned at 1.41.0 | v1.41.0 broke `execute_tool` naming | observability.md |

## Three review questions, answered

1. **Does the span tree survive the two-phase split?** The `invoke_agent` span
   opens in `stream.ts` before Phase 1 and closes after Phase 2, so both `chat`
   spans are children by construction — the gate asserts the tree; the
   behavioural test asserts one root.
2. **Does the ledger `traceId` come from Cloudflare or from `sessionId`?** From
   `sessionId` — `otel.ts` already sets `trace_id = sessionId`. The Cloudflare
   trace id is the transport's and is not persisted; storing it would tie the
   audit to one observability vendor.
3. **Is the prompt version hand-maintained or derived?** Derived from
   `sha256(SYSTEM_PROMPT).slice(0, 12)` plus a semver tag in a comment. The hash
   catches every edit; a hand-maintained version lies.

## Explicitly not in this wave

Alerting and SLOs (a later wave with its own on-call model); the eval-score
stream; a self-hosted collector (a deployment choice, not a code change); and
the BYOK provider-routing seam (named in Phase 0b, filed, not built here).