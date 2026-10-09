import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultProvider } from '../src/dreamer.mjs';

/** Build a fake fetchImpl that returns a JSON body. */
const fakeFetch = (body) => async () => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

test('normalizes an OBJECT-shaped result.response (SK-LLM-036: no [object Object])', async () => {
  // JSON Mode attempt returns an object-shaped response (a pre-parsed array).
  const provider = defaultProvider('x', {
    schema: { $defs: {} },
    fetchImpl: fakeFetch({ result: { response: [{ type: 'GlassPanel' }, { type: 'Card' }] } }),
  });
  const text = await provider;
  const parsed = JSON.parse(text);
  assert.ok(Array.isArray(parsed), 'object response stringified to a JSON array');
  assert.equal(parsed.length, 2);
});

test('falls through to unconstrained when JSON Mode returns an EMPTY array', async () => {
  // First call (JSON Mode): [] — must NOT be accepted. Second call: real array.
  const jsonModeEmpty = fakeFetch({ result: { response: [] } });
  const fallback = fakeFetch({ result: { response: [{ type: 'Card', props: { title: 'ok' } }] } });
  let calls = 0;
  const fetchImpl = async (url, init) => {
    calls++;
    const hasResponseFormat = init && JSON.parse(init.body)?.response_format;
    return hasResponseFormat ? jsonModeEmpty() : fallback();
  };
  const text = await defaultProvider('x', { schema: { $defs: {} }, fetchImpl });
  const parsed = JSON.parse(text);
  assert.ok(Array.isArray(parsed) && parsed.length === 1, 'empty JSON Mode fell through to a usable fallback');
  assert.equal(calls, 2, 'both attempts ran');
});

test('accepts a valid non-empty array from JSON Mode without falling through', async () => {
  let calls = 0;
  const fetchImpl = async (url, init) => {
    calls++;
    return new Response(JSON.stringify({ result: { response: [{ type: 'GlassPanel', tokens: ['p31.glass.bg'] }] } }), { status: 200 });
  };
  const text = await defaultProvider('x', { schema: { $defs: {} }, fetchImpl });
  const parsed = JSON.parse(text);
  assert.ok(Array.isArray(parsed) && parsed.length === 1, 'valid JSON Mode array accepted');
  assert.equal(calls, 1, 'no fallback needed');
});