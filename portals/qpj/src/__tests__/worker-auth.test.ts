import { describe, it, expect } from 'vitest';
import { secureEqual } from '../../../../workers/p31-passport/src/auth';
import { passthroughHeaders } from '../../../../workers/p31-dispatch/src/headers';

describe('secureEqual (passport auth gate)', () => {
  it('returns true for equal secrets', async () => {
    expect(await secureEqual('correct-horse', 'correct-horse')).toBe(true);
  });

  it('returns false for unequal secrets of the same length', async () => {
    expect(await secureEqual('correct-horse', 'correct-hor se')).toBe(false);
  });

  it('returns false for unequal secrets of different lengths', async () => {
    expect(await secureEqual('short', 'a-much-longer-secret')).toBe(false);
  });

  it('returns false when the header is null or empty', async () => {
    expect(await secureEqual(null, 'anything')).toBe(false);
    expect(await secureEqual('', 'anything')).toBe(false);
  });
});

describe('passthroughHeaders (dispatch gate)', () => {
  function env(secret?: string): Env {
    return { P31_DISPATCH_SECRET: secret };
  }

  it('injects X-P31-Dispatch-Secret when set', () => {
    const headers = passthroughHeaders(
      new Request('https://proxy.example/api/build', { method: 'POST' }),
      env('s3cret'),
    );
    expect(headers.get('X-P31-Dispatch-Secret')).toBe('s3cret');
  });

  it('overwrites a client-supplied X-P31-Dispatch-Secret', () => {
    const headers = passthroughHeaders(
      new Request('https://proxy.example/api/build', {
        method: 'POST',
        headers: { 'X-P31-Dispatch-Secret': 'client-forged' },
      }),
      env('s3cret'),
    );
    expect(headers.get('X-P31-Dispatch-Secret')).toBe('s3cret');
  });

  it('preserves other inbound headers', () => {
    const headers = passthroughHeaders(
      new Request('https://proxy.example/api/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Custom': 'keep' },
      }),
      env('s3cret'),
    );
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-Custom')).toBe('keep');
  });

  it('leaves the secret header untouched when unset', () => {
    const headers = passthroughHeaders(
      new Request('https://proxy.example/api/status'),
      env(undefined),
    );
    expect(headers.has('X-P31-Dispatch-Secret')).toBe(false);
  });
});