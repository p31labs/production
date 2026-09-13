import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { useQpjStore } from '../store/useQpjStore';
import { defaultModeFor } from '../lib/passports';

describe('passport-isolation — switching identities tears down the old self', () => {
  beforeEach(() => {
    useQpjStore.setState({
      passportId: 'dillpickle',
      mode: 'spark',
      spoons: 3,
      talkTarget: 'family',
      talkMessages: [],
      meshInstance: null,
    });
  });

  it('tears down the mesh, clears chat streams, and resets spoons on switch', () => {
    const mesh = { disconnect: vi.fn() };
    useQpjStore.setState({ meshInstance: mesh as never });
    useQpjStore.getState().pushTalk({ from: 'dillpickle', kind: 'text', body: 'hello street' });
    useQpjStore.getState().setSpoons(5);
    useQpjStore.getState().setMode('workshop');

    useQpjStore.getState().setPassport('breadbutter');

    const after = useQpjStore.getState();
    expect(mesh.disconnect).toHaveBeenCalledTimes(1);
    expect(after.meshInstance).toBeNull();
    expect(after.talkMessages).toHaveLength(0);
    expect(after.talkTarget).toBe('family');
    expect(after.spoons).toBe(3);
    expect(after.mode).toBe(defaultModeFor('breadbutter'));
    expect(after.meshStatus).toBe('idle');
  });

  it('defaults each passport to its role-based mode', () => {
    expect(defaultModeFor('dillpickle')).toBe('spark');
    expect(defaultModeFor('breadbutter')).toBe('maker');
    expect(defaultModeFor('gherkin')).toBe('workshop');
    expect(defaultModeFor('cornichon')).toBe('spark');
  });

  it('keeps treats when switching passports (grounded, not per-person)', () => {
    useQpjStore.getState().addTreats(4);
    useQpjStore.getState().setPassport('halfsour');
    expect(useQpjStore.getState().treatsReceived).toBe(4);
  });
});