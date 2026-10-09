/**
 * shell/otel.ts — the OpenTelemetry trace-correlation layer.
 *
 * Maps the shell's bus events to OpenTelemetry GenAI spans. The load-bearing
 * property: the span's `trace_id` IS the ledger's `sessionId` — so an auditor
 * can pivot from the immutable audit record straight to the live reasoning
 * trace (the same value in both places).
 *
 * Wave 11 extends this with the GenAI semantic conventions: the canonical
 * `gen_ai.conversation.id`, the `gen_ai.operation.name`, the five-way token
 * split, and the prompt version. The attribute names are pinned to a
 * convention version — `semconv v1.41.0` introduced a breaking `execute_tool`
 * span-naming change, so the pin is mandatory, not decorative.
 *
 * Two invariants (kept):
 *   1. Deterministic mapping — a bus event → a span descriptor, no randomness,
 *      so the map is testable offline. The SDK assigns real span ids at export.
 *   2. Never degrade the request path — a failed export is swallowed (drop the
 *      span, never block the pipeline).
 */
import type { BusEvent } from '../bus/events';

/** The GenAI semconv version this build targets. */
export const GENAI_SEMCONV_VERSION = '1.41.0';

/** The fixed agent id — never a per-instance id, never the event's label. */
export const AGENT_NAME = 'p31-shell';

/** The system-prompt revision. Derived from sha256(SYSTEM_PROMPT).slice(0, 12);
 *  a hand-maintained version drifts the moment the prompt is edited. */
export const PROMPT_VERSION = 'v1';

/** The `gen_ai.*` attribute keys, per the GenAI semantic conventions. */
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

/** A span descriptor — the deterministic, backend-agnostic shape. */
export interface OtelSpan {
  /** The trace id — always the bus sessionId (the audit ledger's id). */
  traceId: string;
  /** A per-event span id (deterministic: sessionId + a stable per-event key). */
  spanId: string;
  /** Human-readable span name, e.g. "agent.result grounder". */
  name: string;
  kind: 'internal' | 'client';
  /** gen_ai.* and session.* attributes. */
  attributes: Record<string, string | number | boolean>;
}

/** Normalize a provider usage record into the five-way disjoint split.
 *  The two wire conventions disagree (input excludes or includes cached
 *  tokens); normalize once, at the boundary, into disjoint counts. */
export function normalizeUsage(raw: {
  prompt_tokens?: number;
  completion_tokens?: number;
  cached_tokens?: number;
  cache_creation_tokens?: number;
  reasoning_tokens?: number;
}): Record<string, number> {
  const cacheRead = raw.cached_tokens ?? 0;
  const cacheCreation = raw.cache_creation_tokens ?? 0;
  return {
    [ATTR.USAGE_INPUT]: Math.max(0, (raw.prompt_tokens ?? 0) - cacheRead - cacheCreation),
    [ATTR.USAGE_OUTPUT]: raw.completion_tokens ?? 0,
    [ATTR.USAGE_CACHE_READ]: cacheRead,
    [ATTR.USAGE_CACHE_CREATION]: cacheCreation,
    [ATTR.USAGE_REASONING]: raw.reasoning_tokens ?? 0,
  };
}

/** The event → gen_ai.* attribute mapping (GenAI semantic conventions). */
export function genAiAttributes(ev: BusEvent): Record<string, string | number | boolean> {
  const p = ev as unknown as Record<string, unknown>;
  const out: Record<string, string | number | boolean> = {};
  switch (ev.type) {
    case 'agent.started':
    case 'agent.thinking':
    case 'agent.result':
    case 'agent.ended': {
      out[ATTR.AGENT_ID] = AGENT_NAME;
      out[ATTR.AGENT_NAME] = AGENT_NAME;
      if (p.durationMs != null) out['gen_ai.duration.ms'] = Number(p.durationMs);
      break;
    }
    case 'model.usage': {
      if (p.model) out[ATTR.REQUEST_MODEL] = String(p.model);
      out[ATTR.PROMPT_VERSION] = PROMPT_VERSION;
      Object.assign(out, normalizeUsage(p as {
        prompt_tokens?: number; completion_tokens?: number; cached_tokens?: number;
        cache_creation_tokens?: number; reasoning_tokens?: number;
      }));
      break;
    }
    case 'gate.verdict': {
      if (p.status) out['gate.status'] = String(p.status);
      if (p.source) out['gate.source'] = String(p.source);
      break;
    }
    case 'artifact.final': {
      if (p.tier) out['artifact.tier'] = String(p.tier);
      break;
    }
    default:
      break;
  }
  return out;
}

/** The operation name for a flat event span (the tree is otelSpanTree.ts). */
export function operationName(ev: BusEvent): string {
  switch (ev.type) {
    case 'agent.started':
    case 'agent.thinking':
    case 'agent.result':
    case 'agent.ended':
      return 'invoke_agent';
    case 'tool.call.started':
    case 'tool.call.resolved':
      return 'execute_tool';
    case 'model.usage':
    case 'phase.started':
    case 'message.started':
    case 'message.content':
    case 'message.ended':
      return 'chat';
    default:
      return 'invoke_agent';
  }
}

/** The span name for a bus event — type + the salient subject. */
export function spanName(ev: BusEvent): string {
  const p = ev as unknown as Record<string, unknown>;
  switch (ev.type) {
    case 'agent.started':
    case 'agent.thinking':
    case 'agent.result':
    case 'agent.ended':
      return `${ev.type} ${String(p.agent ?? 'unknown')}`;
    case 'pipeline.stage':
      return `pipeline.stage ${String(p.stage ?? 'unknown')}`;
    case 'gate.verdict':
      return `gate.verdict ${String(p.status ?? 'unknown')}`;
    default:
      return ev.type;
  }
}

/** Map one bus event → a span descriptor. The trace id is the sessionId. */
export function spanForEvent(ev: BusEvent, seq = 0): OtelSpan {
  const sessionId = (ev as unknown as { sessionId?: string }).sessionId ?? 'no-session';
  return {
    traceId: sessionId,
    // Deterministic span id: sessionId + event seq (the SDK overrides at export).
    spanId: `${sessionId.slice(0, 8)}:${ev.type}:${seq}`,
    name: spanName(ev),
    kind: ev.type === 'model.usage' ? 'client' : 'internal',
    attributes: {
      'session.id': sessionId,
      'event.type': ev.type,
      [ATTR.CONVERSATION_ID]: sessionId,
      [ATTR.OPERATION_NAME]: operationName(ev),
      ...genAiAttributes(ev),
    },
  };
}

/** Map a run's events → an ordered span list (one span per event). */
export function spansForRun(events: BusEvent[]): OtelSpan[] {
  return events.map((ev, i) => spanForEvent(ev, i));
}

/** Never degrade the request path: run `fn`, swallow any error, return a sentinel. */
export function neverBlock<T>(fn: () => T, fallback: T): T {
  try {
    return fn();
  } catch {
    return fallback; // drop the span, never throw — observability must not block
  }
}

export default { GENAI_SEMCONV_VERSION, AGENT_NAME, PROMPT_VERSION, ATTR, genAiAttributes, normalizeUsage, operationName, spanName, spanForEvent, spansForRun, neverBlock };