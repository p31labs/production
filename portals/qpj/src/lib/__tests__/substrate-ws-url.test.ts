import { describe, it, expect } from 'vitest';
import { resolveWsBaseUrl } from '../substrate-ws-url';

describe('resolveWsBaseUrl', () => {
  it('returns null when neither substrate URL nor WS base is set', () => {
    expect(resolveWsBaseUrl(null, null)).toBeNull();
  });

  it('defaults to the substrate (dispatch) URL when no WS base is set', () => {
    expect(resolveWsBaseUrl('https://p31-dispatch.example.workers.dev', null)).toBe(
      'https://p31-dispatch.example.workers.dev',
    );
  });

  it('prefers VITE_P31_WS_BASE when set', () => {
    expect(
      resolveWsBaseUrl(
        'https://p31-dispatch.example.workers.dev',
        'wss://p31-passport.example.workers.dev',
      ),
    ).toBe('wss://p31-passport.example.workers.dev');
  });
});