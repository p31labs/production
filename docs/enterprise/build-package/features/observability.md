<!-- P31-HEADER
id: p31_feature_observability_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Observability (OTel GenAI)

## The invariant

Every span an agent's work produces carries the conversation id, the agent name,
and the operation name; a turn is one `invoke_agent` span with `chat` and
`execute_tool` children; every model span carries the five-way token split and a
prompt version; and a ledger row joins to its trace without the ledger depending
on the trace.

## What already exists (this wave extends, it does not build)

`src/shell/otel.ts` shipped in Wave 1 as the trace-correlation layer, and its
load-bearing property is already correct: **the span's `trace_id` is the
ledger's `sessionId`**, deterministic and backend-agnostic. It already maps
`agent.*` events to `gen_ai.agent.name` and `model.usage` to a token attribute,
and it already never degrades the request path (`neverBlock`).

What it does **not** do — the Wave 11 work, named here so no runbook invents a
greenfield:

1. It sets `session.id` but **not `gen_ai.conversation.id`** — the v1.37
   canonical correlation attribute. A downstream consumer that groups on the
   canonical key sees nothing.
2. It sets **no `gen_ai.operation.name`** — every span is flat and unnamed by
   operation. There is no `invoke_agent`/`chat`/`execute_tool` tree; one event is
   one span, no parent-child.
3. Its token mapping is **the four-way legacy shape** — it maps `cached_tokens`
   to the non-standard `gen_ai.usage.cached_tokens`, and it has no
   `cache_read`/`cache_creation`/`reasoning`. The cost split the conventions
   merged in January 2026 is absent.
4. Its agent name is **the event payload's display value** (`String(p.agent)`),
   not a fixed, configuration-driven id — the semconv guidance warns in-memory
   instance ids are transient and SHOULD NOT be recorded.
5. It has **no prompt version** and **no convention-version pin** — a
   `gen_ai.*` rename will break it silently.

## The boundary

This feature does **not** own:

- **The ledger** — the hash-chained audit is the source of truth. A span is a
  telemetry record; a ledger row is an audit record. This feature adds one
  nullable, additive field (`traceId`) and writes nothing else.
- **The export pipeline** — `telemetry-pipeline.md` owns the OTLP exporter, the
  sampling, and the collector-side PII redaction. `otel.ts` already treats the
  exporter as config, not code; this wave keeps that boundary.
- **The compliance export** — Wave 10's `compliance.md` owns the tamper-evident
  bundle. The trace is for debugging; the bundle is for a regulator.
- **Custom metrics** — Cloudflare does not export them. The token histogram is a
  span attribute (`telemetry-pipeline.md` names the constraint).

Seven rules this feature owns outright:

1. **Three attributes on every span the agent produces.** `gen_ai.conversation.id
   = sessionId`, `gen_ai.agent.name = 'p31-shell'` (a fixed, configuration-driven
   id), `gen_ai.operation.name` ∈ `{invoke_agent, create_agent, execute_tool,
   chat, invoke_workflow}`. A span without the conversation id is an orphan.
2. **The conversation id propagates into downstream spans.** The D1 insert, the
   DO call, the model fetch, the tool's own work — all carry
   `gen_ai.conversation.id`. The LLM-only view is the failure mode this rule
   exists to prevent.
3. **The span tree is one `invoke_agent` per turn.** Phase 1 is a `chat` span;
   each tool call is an `execute_tool` child; Phase 2 is a second `chat` span.
   Model and tool spans are **siblings**, not nested. The flat
   one-event-one-span map in `otel.ts` is replaced by a tree builder over the
   same event stream.
4. **Span names are stable and derive from identifiers, never labels.**
   `invoke_agent {agentName}`, `execute_tool {toolName}`, `chat {model}`. The
   current `spanName` derives from the display label; it must derive from the
   stable identifier.
5. **Every model span carries the five-way split.** `gen_ai.usage.input_tokens`,
   `gen_ai.usage.output_tokens`, `gen_ai.usage.cache_read.input_tokens`,
   `gen_ai.usage.cache_creation.input_tokens`,
   `gen_ai.usage.reasoning.output_tokens`. `model.usage` gains the two missing
   fields (`cache_creation_tokens`, `reasoning_tokens`) additively, and the
   legacy `gen_ai.usage.cached_tokens` mapping is replaced by the standard
   `cache_read` attribute.
6. **Every model span carries a prompt version.** `gen_ai.prompt.version` — the
   system-prompt revision. Without it, a regression cannot be attributed to a
   rollout.
7. **The ledger gains `traceId`, additively, and never depends on it.** A row
   records the trace that produced it. If the trace store is empty — sampled
   away, expired, or not configured — the ledger still verifies.

## The decisions (answered before the build)

| Question | Decision |
|---|---|
| Which agent name? | **A fixed, configuration-driven id** (`p31-shell`), never a per-instance id and never the event's display label. |
| Is the conversation id the session id? | **Yes.** `gen_ai.conversation.id = sessionId`, replacing the existing `session.id` as the canonical correlation key (both are kept; the canonical one is added). |
| Does the ledger carry the trace id? | **Yes, additive and nullable.** `traceId?` on the append meta and the event envelope; the SQL column is `trace_id` (nullable). |
| Are the conventions pinned? | **Yes.** A `GENAI_SEMCONV_VERSION` constant gates the attribute names; a rename is a spec change, not a silent drift. |

## The implementation

| File | What it provides |
|---|---|
| `src/shell/otel.ts` | *(modified)* add `gen_ai.conversation.id`, `gen_ai.operation.name`, the five-way split with standard names, `gen_ai.prompt.version`, the `GENAI_SEMCONV_VERSION` pin, and the fixed `p31-shell` agent id |
| `src/shell/otelSpanTree.ts` | *(new)* the `invoke_agent`/`chat`/`execute_tool` tree builder over the flat event stream |
| `src/shell/useTurnSpans.ts` | *(new)* subscribes to the bus and opens the span tree per turn |
| `src/shell/otel.test.ts` | *(modified)* pins the new attributes and the tree |
| `src/bus/events.ts` | *(modified)* `cache_creation_tokens`, `reasoning_tokens` on `model.usage`; `traceId?` on the event envelope |
| `functions/_lib/ledger.ts` | *(modified)* `traceId?` on the append meta (nullable, additive) |
| `portals/shell/room/src/SessionRoom.ts` | *(modified, Wave 8 file)* the DO's spans carry the conversation id |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| three attributes | every agent span has conversation id + agent name + operation name | a span is an orphan |
| downstream propagation | a D1 query span inside a turn carries the conversation id | the D1 span has no conversation id |
| span tree | one `invoke_agent`, two `chat`, N `execute_tool`, siblings | tools nested under a chat span |
| stable names | a tool label change does not change the span name | the span name follows the label |
| five-way split | a model span carries all five token attributes | only `input`/`output` are present |
| prompt version | every model span carries the prompt version | a span has no prompt version |
| ledger join, no dependency | a row carries `traceId`; with the trace store empty, the chain verifies | the chain fails when the trace store is absent |

## The gate

```bash
node scripts/gate.mjs --feature observability
npx playwright test tests/e2e/observability.spec.ts
```

The structural assertions are a precondition. The behavioural assertions are the
gate: (a) a turn produces one `invoke_agent` span with two `chat` and N
`execute_tool` children; (b) every child carries the conversation id; (c) the
chain verifies with the trace store disabled.

## The escalation

When this feature blocks a surface, the surface does not ship to an operator
who has to debug it. An agent run with no span tree is a run that can only be
explained by reading the transcript — and the transcript does not show the
retriever query that returned nothing.