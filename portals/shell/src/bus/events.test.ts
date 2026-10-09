/**
 * bus/events.test.ts — the event contract (the seam).
 */
import { describe, expect, it } from 'vitest';
import { BUS_EVENT_TYPES, toSseFrame, eventType } from './events';
import type { BusEvent } from './events';

describe('bus event contract', () => {
  it('knows every event discriminant', () => {
    expect(BUS_EVENT_TYPES).toContain('run.started');
    expect(BUS_EVENT_TYPES).toContain('gate.verdict');
    expect(BUS_EVENT_TYPES).toContain('brain.complete');
    expect(BUS_EVENT_TYPES).toContain('artifact.final');
    expect(BUS_EVENT_TYPES).toContain('love.minted');
    expect(BUS_EVENT_TYPES).toContain('entitlement.consumed');
  });

  it('serializes an event to an SSE frame', () => {
    const ev: BusEvent = { type: 'gate.verdict', sessionId: 's1', status: 'pass', axes: { x: 0.5 } };
    const frame = toSseFrame(ev);
    expect(frame.startsWith('event: gate.verdict\n')).toBe(true);
    expect(frame).toContain('"status":"pass"');
    expect(frame.endsWith('\n\n')).toBe(true);
  });

  it('eventType returns the discriminant', () => {
    expect(eventType({ type: 'brain.started', sessionId: 's1' })).toBe('brain.started');
  });

  it('knows the full AG-UI taxonomy additions', () => {
    expect(BUS_EVENT_TYPES).toContain('reasoning.started');
    expect(BUS_EVENT_TYPES).toContain('reasoning.content');
    expect(BUS_EVENT_TYPES).toContain('reasoning.ended');
    expect(BUS_EVENT_TYPES).toContain('state.snapshot');
    expect(BUS_EVENT_TYPES).toContain('state.delta');
    expect(BUS_EVENT_TYPES).toContain('subagent.started');
    expect(BUS_EVENT_TYPES).toContain('subagent.finished');
    expect(BUS_EVENT_TYPES).toContain('subagent.error');
    expect(BUS_EVENT_TYPES).toContain('run.interrupted');
    expect(BUS_EVENT_TYPES).toContain('run.resumed');
  });

  it('knows the Wave 7 phase + sharing discriminants', () => {
    expect(BUS_EVENT_TYPES).toContain('phase.started');
    expect(BUS_EVENT_TYPES).toContain('artifact.shared');
    expect(BUS_EVENT_TYPES).toContain('artifact.share.expired');
    expect(BUS_EVENT_TYPES).toContain('artifact.persisted');
    expect(BUS_EVENT_TYPES.length).toBe(new Set(BUS_EVENT_TYPES).size);
  });

  it('serializes a phase + coalesced content event', () => {
    const phase: BusEvent = { type: 'phase.started', sessionId: 's1', phase: 'response' };
    expect(toSseFrame(phase)).toContain('"phase":"response"');

    const content: BusEvent = { type: 'message.content', sessionId: 's1', text: 'hello', messageKey: 'mk-1', partial: true };
    expect(toSseFrame(content)).toContain('"messageKey":"mk-1"');
    expect(toSseFrame(content)).toContain('"partial":true');
  });

  it('serializes reasoning + state delta + interrupt events', () => {
    const reasoning: BusEvent = { type: 'reasoning.content', sessionId: 's1', agent: 'dreamer', text: 'exploring layouts' };
    expect(toSseFrame(reasoning)).toContain('"type":"reasoning.content"');

    const delta: BusEvent = { type: 'state.delta', sessionId: 's1', patch: [{ op: 'replace', path: '/status', value: 'dreaming' }] };
    expect(toSseFrame(delta)).toContain('"op":"replace"');

    const interrupt: BusEvent = { type: 'run.interrupted', sessionId: 's1', interruptId: 'i1', reason: 'high-risk action', risk: 'high' };
    expect(toSseFrame(interrupt)).toContain('"risk":"high"');
  });
});