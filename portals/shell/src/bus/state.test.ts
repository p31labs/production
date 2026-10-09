/**
 * bus/state.test.ts — shared agent state via RFC 6902 JSON Patch.
 */
import { describe, expect, it } from 'vitest';
import { applyPatch } from 'fast-json-patch';
import { toSseFrame, type StateSnapshot, type StateDelta, type JsonPatchOp } from './events';

describe('bus shared state (AG-UI STATE_SNAPSHOT / STATE_DELTA)', () => {
  it('a delta amends a snapshot via RFC 6902', () => {
    const snapshot: StateSnapshot = { type: 'state.snapshot', sessionId: 's1', state: { status: 'idle', todos: [] } };
    const delta: StateDelta = {
      type: 'state.delta',
      sessionId: 's1',
      patch: [
        { op: 'replace', path: '/status', value: 'dreaming' },
        { op: 'add', path: '/todos/-', value: { id: 1, text: 'design layout' } },
      ],
    };
    const patched = applyPatch(snapshot.state, delta.patch as JsonPatchOp[]).newDocument;
    expect(patched.status).toBe('dreaming');
    expect(patched.todos).toHaveLength(1);
  });

  it('serializes the delta patch op', () => {
    const delta: StateDelta = {
      type: 'state.delta',
      sessionId: 's1',
      patch: [{ op: 'replace', path: '/status', value: 'done' }],
    };
    expect(toSseFrame(delta)).toContain('"op":"replace"');
  });
});