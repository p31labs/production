/**
 * session.test.mjs — negative controls for the session-affinity manager.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { newSessionId, assertCacheSafe, cacheReport } from '../research/session.mjs';

test('newSessionId: stable format, unique per run', () => {
  const a = newSessionId();
  const b = newSessionId();
  assert.match(a, /^ses_[0-9a-f]{16}$/);
  assert.notEqual(a, b, 'two runs must not share a session id');
});

test('assertCacheSafe: a timestamp in the system prompt fails', () => {
  const bad = assertCacheSafe('You are a researcher. Today is 2026-10-04T12:00:00Z. ' + 'x'.repeat(4000));
  assert.equal(bad.ok, false);
  assert.ok(bad.problems.some((p) => p.includes('timestamp')));
});

test('assertCacheSafe: a below-block prefix fails', () => {
  const short = assertCacheSafe('You are a researcher.');
  assert.equal(short.ok, false);
  assert.ok(short.problems.some((p) => p.includes('block')));
});

test('assertCacheSafe: a static long prompt passes', () => {
  const good = assertCacheSafe('You are the P31 researcher. ' + 'x'.repeat(5000));
  assert.equal(good.ok, true);
  assert.ok(good.approxTokens >= 1024);
});

test('cacheReport: first call is cold, second is warm', () => {
  const cold = cacheReport({ promptTokens: 2000, completionTokens: 300, cachedPromptTokens: 0, modelUsed: 'm' });
  assert.equal(cold.cold, true);
  assert.equal(cold.hitRatePct, 0);

  const warm = cacheReport({ promptTokens: 2000, completionTokens: 300, cachedPromptTokens: 1800, modelUsed: 'm' });
  assert.equal(warm.cachedTokens, 1800);
  assert.equal(warm.hitRatePct, 90);
  assert.equal(warm.cold, false);
});