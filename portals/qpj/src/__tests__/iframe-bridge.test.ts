/**
 * QPJ — iframe bridge tests (parent side of the protocol mirror).
 *
 * Tests the pure surface: message classification, shell token resolution, the
 * live-copy formatter, and the child postMessage.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  activityLabel,
  isBridgeMessage,
  readShellTokens,
  sendToChild,
  type BridgeMessage,
} from '../lib/iframeBridge';

afterEach(() => {
  vi.restoreAllMocks();
  document.documentElement.removeAttribute('style');
});

describe('isBridgeMessage', () => {
  it('accepts p31:* messages and rejects everything else', () => {
    expect(isBridgeMessage({ type: 'p31:ready' })).toBe(true);
    expect(isBridgeMessage({ type: 'song:ready' })).toBe(false);
    expect(isBridgeMessage({ type: 'p31:' })).toBe(false);
    expect(isBridgeMessage(null)).toBe(false);
    expect(isBridgeMessage('p31:ready')).toBe(false);
  });

  it('accepts the extended collaboration fields (spoons, zoneAuthor)', () => {
    expect(isBridgeMessage({ type: 'p31:identity', pickledName: 'Dillpickle', passportId: 'dillpickle', spoons: 2 })).toBe(true);
    expect(
      isBridgeMessage({
        type: 'p31:activity',
        kind: 'trigger',
        zone: 'the sun',
        author: 'Dillpickle',
        at: 1,
        zones: 4,
        zoneAuthor: 'Cornichon',
      }),
    ).toBe(true);
  });
});

describe('readShellTokens', () => {
  it('resolves only the instrument-facing color tokens from computed style', () => {
    const root = document.createElement('div');
    root.style.setProperty('--p31-bg', 'oklch(10% 0.01 240)');
    root.style.setProperty('--p31-accent', 'oklch(72% 0.12 75)');
    root.style.setProperty('--p31-space-md', '16px');
    root.style.setProperty('--x-other', 'red');
    const tokens = readShellTokens(root);
    expect(tokens['--p31-bg']).toBe('oklch(10% 0.01 240)');
    expect(tokens['--p31-accent']).toBe('oklch(72% 0.12 75)');
    // Structural tokens are not in the instrument surface.
    expect(tokens['--p31-space-md']).toBeUndefined();
    expect(tokens['--x-other']).toBeUndefined();
  });
});

describe('activityLabel', () => {
  it('renders the live line for each kind', () => {
    const at = 1;
    expect(
      activityLabel({ type: 'p31:activity', kind: 'trigger', zone: 'the sun', author: 'Dillpickle', at, zones: 3 }),
    ).toBe('3 zones · Dillpickle played the sun');
    expect(
      activityLabel({ type: 'p31:activity', kind: 'place', zone: '', author: 'Dillpickle', at, zones: 3 }),
    ).toBe('3 zones · Dillpickle placed a zone');
    expect(
      activityLabel({ type: 'p31:activity', kind: 'clear', zone: 'the sun', author: 'Dillpickle', at, zones: 3 }),
    ).toBe('3 zones · Dillpickle cleared a zone');
  });

  it('falls back to "someone" when no author is known', () => {
    const m: Extract<BridgeMessage, { type: 'p31:activity' }> = {
      type: 'p31:activity',
      kind: 'trigger',
      zone: '',
      author: 'someone',
      at: 1,
      zones: 2,
    };
    expect(activityLabel(m)).toBe('2 zones · someone played a sound');
  });
});

describe('sendToChild', () => {
  it('no-ops without a live contentWindow', () => {
    const frame = document.createElement('iframe');
    expect(() => sendToChild(frame, { type: 'p31:ready' })).not.toThrow();
    expect(() => sendToChild(null, { type: 'p31:ready' })).not.toThrow();
  });

  it('posts to the frame contentWindow with a * target', () => {
    const win = { postMessage: vi.fn() } as unknown as Window;
    const frame = document.createElement('iframe');
    vi.spyOn(frame, 'contentWindow', 'get').mockReturnValue(win);
    const msg: BridgeMessage = { type: 'p31:ready' };
    sendToChild(frame, msg);
    expect(win.postMessage).toHaveBeenCalledWith(msg, '*');
  });
});