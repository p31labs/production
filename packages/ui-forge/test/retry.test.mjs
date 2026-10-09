import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRetryableError, retryFetch } from '../src/retry.mjs';

test('isRetryableError classifies correctly', () => {
  assert.equal(isRetryableError({ status: 429 }), true, '429 rate limit retries');
  assert.equal(isRetryableError({ status: 503 }), true, '503 server error retries');
  assert.equal(isRetryableError({ status: 500 }), true, '500 server error retries');
  assert.equal(isRetryableError({ status: 400 }), false, '400 client error fails fast');
  assert.equal(isRetryableError({ status: 404 }), false, '404 fails fast');
  assert.equal(isRetryableError({ code: 7502 }), false, '7502 model-not-found no retry');
  assert.equal(isRetryableError({ code: 7504 }), false, '7504 input-validation no retry');
  assert.equal(isRetryableError({ code: 7506 }), false, '7506 context-limit no retry');
  assert.equal(isRetryableError(new TypeError('network')), true, 'network error retries');
});

test('retryFetch does NOT retry a deterministic 4xx', async () => {
  let calls = 0;
  const fake = async () => { calls++; const r = new Response(JSON.stringify({ error: 'bad' }), { status: 400 }); return r; };
  // Monkey-patch global fetch for this test.
  const orig = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    await assert.rejects(() => retryFetch('http://x', {}, { maxAttempts: 3, baseMs: 1 }));
    assert.equal(calls, 1, '4xx should not retry');
  } finally { globalThis.fetch = orig; }
});

test('retryFetch DOES retry a 5xx up to maxAttempts', async () => {
  let calls = 0;
  const fake = async () => { calls++; return new Response('err', { status: 502 }); };
  const orig = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    await assert.rejects(() => retryFetch('http://x', {}, { maxAttempts: 3, baseMs: 1 }));
    assert.equal(calls, 3, '502 should retry to exhaustion');
  } finally { globalThis.fetch = orig; }
});

test('retryFetch returns the response once a retry succeeds', async () => {
  let calls = 0;
  const fake = async () => {
    calls++;
    if (calls < 3) return new Response('err', { status: 503 });
    return new Response('ok', { status: 200 });
  };
  const orig = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    const res = await retryFetch('http://x', {}, { maxAttempts: 3, baseMs: 1 });
    assert.equal(res.status, 200);
    assert.equal(calls, 3);
  } finally { globalThis.fetch = orig; }
});

test('retryFetch surfaces the internal Workers AI code from a JSON error body', async () => {
  const fake = async () => new Response(JSON.stringify({ code: 7506, error: 'context limit' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  const orig = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    await assert.rejects(
      () => retryFetch('http://x', {}, { maxAttempts: 3, baseMs: 1 }),
      (e) => e.code === 7506,
    );
  } finally { globalThis.fetch = orig; }
});