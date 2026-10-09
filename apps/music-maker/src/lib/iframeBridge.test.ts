/**
 * The music maker — iframe bridge tests.
 *
 * The pure protocol surface: message classification, token overlay, and the
 * parent-side postMessage. jsdom's window.parent === window, so the no-shell
 * no-op is testable directly, and the shell path via a stubbed parent.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  isBridgeMessage,
  applyThemeTokens,
  sendToParent,
  type BridgeMessage,
} from './iframeBridge';

const originalParent = window.parent;

afterEach(() => {
  Object.defineProperty(window, 'parent', { value: originalParent, configurable: true });
  vi.restoreAllMocks();
});

describe('isBridgeMessage', () => {
  it('accepts every p31:* message shape', () => {
    expect(isBridgeMessage({ type: 'p31:ready' })).toBe(true);
    expect(
      isBridgeMessage({ type: 'p31:activity', kind: 'trigger', zone: 'sun', author: 'Dillpickle', at: 1, zones: 3 }),
    ).toBe(true);
    expect(isBridgeMessage({ type: 'p31:identity', pickledName: 'Dillpickle', passportId: 'dillpickle' })).toBe(true);
    expect(isBridgeMessage({ type: 'p31:theme', tokens: { '--p31-bg': 'oklch(10% 0.01 240)' } })).toBe(true);
  });

  it('rejects non-p31 and malformed payloads', () => {
    expect(isBridgeMessage({ type: 'song:activity' })).toBe(false);
    expect(isBridgeMessage({ type: 'p31:' })).toBe(false);
    expect(isBridgeMessage(null)).toBe(false);
    expect(isBridgeMessage('p31:ready')).toBe(false);
    expect(isBridgeMessage({ noType: true })).toBe(false);
  });
});

describe('applyThemeTokens', () => {
  it('overlays --p31-* tokens onto the root', () => {
    const root = document.createElement('div');
    applyThemeTokens(root, {
      '--p31-bg': 'oklch(10% 0.01 240)',
      '--p31-accent': 'oklch(72% 0.12 75)',
    });
    expect(root.style.getPropertyValue('--p31-bg')).toBe('oklch(10% 0.01 240)');
    expect(root.style.getPropertyValue('--p31-accent')).toBe('oklch(72% 0.12 75)');
  });

  it('skips non-token keys a future sender might add', () => {
    const root = document.createElement('div');
    applyThemeTokens(root, { '--p31-bg': 'oklch(10% 0.01 240)', 'x-evil': 'red' });
    expect(root.style.getPropertyValue('--p31-bg')).toBe('oklch(10% 0.01 240)');
    expect(root.style.getPropertyValue('x-evil')).toBe('');
  });
});

describe('sendToParent', () => {
  it('is a silent no-op when there is no shell (standalone worker URL)', () => {
    // jsdom: window.parent === window — the standalone case.
    const spy = vi.spyOn(window, 'postMessage');
    sendToParent({ type: 'p31:ready' });
    expect(spy).not.toHaveBeenCalled();
  });

  it('posts to the shell when one exists, with a * target', () => {
    const fakeParent = { postMessage: vi.fn() };
    Object.defineProperty(window, 'parent', { value: fakeParent, configurable: true });
    const msg: BridgeMessage = { type: 'p31:ready' };
    sendToParent(msg);
    expect(fakeParent.postMessage).toHaveBeenCalledWith(msg, '*');
  });
});