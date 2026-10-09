<!-- P31-HEADER
id: p31_feature_telemetry_pipeline_20261006_v1.0
type: spec
component: shell
status: live
retention: keep-forever
created: 2026-10-06T00:00:00Z
owner: will
-->

# Feature: Telemetry Pipeline

## The invariant

Cloudflare native tracing carries the spans to an OTLP destination without an
in-app SDK; error traces are never sampled away; PII is scrubbed by the collector
before storage; and the trace store and the ledger have separate retentions that
neither store can break for the other.

## The boundary

This feature does **not** own:

- **The span contract** — `observability.md` owns the attributes and the tree.
  This feature ships the spans; it does not shape them.
- **The ledger** — the audit is D1; the trace store is the observability
  backend. They share a `traceId` and nothing else.
- **The compliance export** — Wave 10's `compliance.md` owns the bundle. The
  bundle is a file; the trace is a stream.
- **Alerting** — a later wave. This feature exports; it does not page.

Five rules this feature owns outright:

1. **Cloudflare native tracing is the exporter.** `observability.traces.enabled
   = true` in `wrangler.toml`, plus a destination in the dashboard. **No OTel SDK
   in the app** — the Worker instruments fetch, D1, R2, KV, and Durable Object
   calls automatically, including RPC calls across the Worker/DO boundary.
2. **Cloudflare exports traces and logs, not metrics.** This is a platform
   constraint, not a choice. `gen_ai.client.token.usage` is therefore **emitted
   as span attributes and derived by the backend** — the token histogram is a
   query over spans, not an exported metric. This constraint is named here so no
   runbook assumes a metric that cannot ship.
3. **Error traces are never sampled.** Tail-based sampling keeps 100% of error
   traces and samples successes. A uniform 1% rate buries the long tail — the
   failures a debugging session is actually about.
4. **PII redaction is the collector's job, before storage.** The app emits
   content; the collector's transform processor scrubs `gen_ai.prompt`,
   `gen_ai.completion`, and tool arguments before the backend stores them. For a
   regulated deployment, `disable_content_logging` drops the content attributes
   entirely. **The app does not redact** — an app that redacts emits a trace the
   backend cannot compare to the un-redacted case.
5. **Two stores, two retentions, neither dependent.** The trace store is
   sampled and short-lived; the ledger is complete and keep-forever. A trace
   expiring must not break a ledger row; a ledger row must not require a trace.
   The join is `traceId`, and the join is best-effort.

## The implementation

| File | What it provides |
|---|---|
| `portals/shell/wrangler.toml` | `observability.traces.enabled = true`; the destination |
| `portals/shell/room/wrangler.toml` | *(Wave 8 file)* the same, for the room Worker |
| `functions/_lib/telemetry.ts` | the sampling decision (errors always; successes sampled) |
| `functions/_lib/ledger.ts` | *(modified)* `traceId?` on append (the join, best-effort) |

## The tests (negative controls in both directions)

| Test | Pass case | Fail case |
|---|---|---|
| native tracing | `wrangler.toml` enables traces; no SDK import in `src/` | an SDK is imported |
| the metrics constraint | the token histogram is documented as span-derived | a metric export is assumed |
| errors never sampled | an error trace has `sampling.priority = 1` | an error trace is sampled at 1% |
| redaction is collector-side | the collector config scrubs; the app does not | the app redacts before export |
| the stores are independent | the chain verifies with the trace store disabled | the chain requires a trace |
| the join is best-effort | a row with no matching span still verifies | a missing span fails the row |

## The gate

```bash
node scripts/gate.mjs --feature telemetry-pipeline
```

The structural assertions are a precondition: native tracing is enabled in both
`wrangler.toml` files; no OTel SDK is imported; errors are never sampled;
redaction and the metrics constraint are documented as collector-side and
platform-limited respectively; the app does not redact; and the chain verifies
without the trace store.

## The escalation

When this feature blocks a surface, the surface does not ship to a buyer with a
telemetry requirement. A trace that cannot be stored is a trace that does not
exist — and a ledger that requires a trace is an audit that breaks when the
observability budget is cut.