/**
 * shell/otel.test.ts — negative controls for the OTel trace-correlation layer.
 * The invariant under test: the span's trace_id IS the ledger's sessionId, so
 * the audit record and the live trace pivot on the same value.
 */
import { describe, expect, it } from 'vitest';
import { genAiAttributes, spanName, spanForEvent, spansForRun, neverBlock } from './otel';
import type { BusEvent } from '../bus/events';

const SESSION = '346061d4-b83f-44e2-9164-376815a50f24';

describe('trace correlation', () => {
  it('span trace_id equals the event sessionId', () => {
    const ev: BusEvent = { type: 'agent.started', sessionId: SESSION, agent: 'grounder' };
    const span = spanForEvent(ev, 0);
    expect(span.traceId).toBe(SESSION);
  });

  it('different events share the same trace_id within a run', () => {
    const events: BusEvent[] = [
      { type: 'agent.started', sessionId: SESSION, agent: 'grounder' },
      { type: 'model.usage', sessionId: SESSION, model: 'm', prompt_tokens: 10, completion_tokens: 5 },
      { type: 'gate.verdict', sessionId: SESSION, status: 'pass' },
    ];
    const spans = spansForRun(events);
    expect(new Set(spans.map((s) => s.traceId)).size).toBe(1);
    expect(spans.length).toBe(3);
  });

  it('events without a sessionId fall back to a stable sentinel (never null trace)', () => {
    const ev = { type: 'agent.result', agent: 'grounder', summary: 'x' } as BusEvent;
    const span = spanForEvent(ev, 0);
    expect(span.traceId).toBe('no-session');
  });
});

describe('gen_ai attributes', () => {
  it('maps agent events to the fixed agent id (never the display label)', () => {
    const attrs = genAiAttributes({ type: 'agent.result', sessionId: SESSION, agent: 'dreamer', summary: 'x' });
    expect(attrs['gen_ai.agent.id']).toBe('p31-shell');
    expect(attrs['gen_ai.agent.name']).toBe('p31-shell');
  });

  it('maps model.usage to the five-way token split, normalized once', () => {
    const attrs = genAiAttributes({
      type: 'model.usage', sessionId: SESSION, model: 'gemma-4', prompt_tokens: 200, completion_tokens: 50, cached_tokens: 150,
    });
    expect(attrs['gen_ai.request.model']).toBe('gemma-4');
    // input excludes cached tokens (normalized into disjoint counts).
    expect(attrs['gen_ai.usage.input_tokens']).toBe(50);
    expect(attrs['gen_ai.usage.output_tokens']).toBe(50);
    expect(attrs['gen_ai.usage.cache_read.input_tokens']).toBe(150);
    expect(attrs['gen_ai.usage.cache_creation.input_tokens']).toBe(0);
    expect(attrs['gen_ai.usage.reasoning.output_tokens']).toBe(0);
  });

  it('returns an empty map for un-mapped event types', () => {
    expect(genAiAttributes({ type: 'run.started', sessionId: SESSION })).toEqual({});
  });
});

describe('span attributes', () => {
  it('carries gen_ai.conversation.id and gen_ai.operation.name', () => {
    const span = spanForEvent({ type: 'tool.call.started', sessionId: SESSION, toolCallId: 't1', toolName: 'search' });
    expect(span.attributes['gen_ai.conversation.id']).toBe(SESSION);
    expect(span.attributes['gen_ai.operation.name']).toBe('execute_tool');
  });
});

describe('neverBlock', () => {
  it('returns the value when the function succeeds', () => {
    expect(neverBlock(() => 42, -1)).toBe(42);
  });

  it('returns the fallback when the function throws (drop, never block)', () => {
    expect(neverBlock(() => { throw new Error('boom'); }, 'dropped')).toBe('dropped');
  });
});

describe('span name', () => {
  it('names agent spans with the agent', () => {
    expect(spanName({ type: 'agent.result', sessionId: SESSION, agent: 'shaper', summary: 'x' })).toBe('agent.result shaper');
  });
  it('names pipeline.stage with the stage', () => {
    expect(spanName({ type: 'pipeline.stage', sessionId: SESSION, stage: 'repair', status: 'done' })).toBe('pipeline.stage repair');
  });
  it('defaults to the bare event type', () => {
    expect(spanName({ type: 'run.started', sessionId: SESSION })).toBe('run.started');
  });
});