import { describe, it, expect, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { clampSpoons } from '../lib/passports';
import { useQpjStore } from '../store/useQpjStore';
import { useModeEffects } from '../hooks/useModeEffects';

describe('spoon-clamp — energy never leaves 0–5', () => {
  beforeEach(() => {
    useQpjStore.setState({ spoons: 3, passportId: 'dillpickle' });
  });

  it('clamps to the 0–5 range', () => {
    expect(clampSpoons(-3)).toBe(0);
    expect(clampSpoons(0)).toBe(0);
    expect(clampSpoons(2.4)).toBe(2);
    expect(clampSpoons(5)).toBe(5);
    expect(clampSpoons(99)).toBe(5);
  });

  it('rounds and neutralizes non-finite input (NaN → default 3)', () => {
    expect(clampSpoons(1.7)).toBe(2);
    expect(clampSpoons(Number.NaN)).toBe(3);
    expect(clampSpoons(Number.POSITIVE_INFINITY)).toBe(3);
  });

  it('setSpoons clamps through the store', () => {
    useQpjStore.getState().setSpoons(8);
    expect(useQpjStore.getState().spoons).toBe(5);
    useQpjStore.getState().setSpoons(-2);
    expect(useQpjStore.getState().spoons).toBe(0);
  });

  it('mirrors spoons + mode onto <html> attributes after mount', () => {
    function Probe() {
      useModeEffects();
      return null;
    }

    useQpjStore.getState().setSpoons(4);
    const { unmount } = render(<Probe />);
    const root = document.documentElement;
    expect(root.dataset.spoons).toBe('4');
    expect(root.dataset.mode).toBe('spark');
    expect(root.dataset.passport).toBe('dillpickle');
    expect(root.style.getPropertyValue('--p31-spoon-level')).toBe('4');

    act(() => {
      useQpjStore.getState().setSpoons(0);
    });
    expect(root.dataset.spoons).toBe('0');
    expect(root.style.getPropertyValue('--p31-spoon-level')).toBe('0');

    unmount();
  });
});