/**
 * shell/chrome.test.ts — the heavy-hitter chrome: notification store +
 * spoon-store wiring (the state layer; the canon components are store-agnostic).
 */
import { describe, expect, it } from 'vitest';
import { useNotifStore } from '../store/useNotifStore';
import { useShellStore } from './store';

describe('notification store', () => {
  it('notifies, stacks, and dismisses', () => {
    const s = useNotifStore.getState();
    s.clearAll();
    s.notify({ kind: 'success', title: 'Artifact ready', body: 'rendered', burst: true });
    s.notify({ kind: 'error', title: 'Gate failed' });
    const items = useNotifStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[1].kind).toBe('error');
    expect(items[0].burst).toBe(true);
    useNotifStore.getState().dismiss(items[0].id);
    expect(useNotifStore.getState().items).toHaveLength(1);
  });

  it('caps the kept stack at 8', () => {
    const s = useNotifStore.getState();
    s.clearAll();
    for (let i = 0; i < 12; i++) s.notify({ kind: 'info', title: `n${i}` });
    expect(useNotifStore.getState().items).toHaveLength(8);
  });
});

describe('shell store spoon wiring', () => {
  it('setSpoons clamps 0–5 and sets the motion-scale curve', () => {
    const s = useShellStore.getState();
    s.setSpoons(7);
    expect(useShellStore.getState().spoons).toBe(5);
    s.setSpoons(3);
    expect(useShellStore.getState().spoons).toBe(3);
    // The motion-scale token is applied on the documentElement.
    expect(document.documentElement.style.getPropertyValue('--motion-scale')).toBe('0.6');
    s.setSpoons(0);
    expect(document.documentElement.dataset.spoons).toBe('0');
    expect(document.documentElement.style.getPropertyValue('--motion-scale')).toBe('0');
  });
});