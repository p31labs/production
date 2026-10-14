/**
 * @file mcp-tiers.test.mjs — node:test suite for the B4 tier adapters.
 * Run: node --test mcp-tiers.test.mjs
 *
 * Cases (runbook v3.0 §5 B-4 + mcp-resolution.md §c):
 *   390 coarse          -> mobile
 *   1200 fine           -> desktop, touchTargetMin 34
 *   1200 coarse         -> desktop WITH flags.coarse true (surfaced, never
 *                          collapsed — runbook §2.5 negative control)
 *   pointer "stylus"    -> error object (TypeError propagated as JSON-RPC
 *                          error), never a guessed tier
 *   width "abc"         -> error object
 *   get_tier_tokens valid tier -> frozen manifest object
 *   get_tier_tokens unknown   -> error object naming the valid set
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve_device_tier, get_tier_tokens } from './mcp-tiers.mjs';

test('resolve_device_tier: 390dp coarse -> mobile (M3 compact)', () => {
  const { ok, result } = resolve_device_tier({
    width_dp: 390, pointer: 'coarse', hover: 'none',
  });
  assert.equal(ok, true);
  assert.equal(result.tier, 'mobile');
  assert.equal(result.windowSizeClass, 'compact');
  assert.equal(result.touchTargetMin, 44);
  assert.equal(result.navigation, 'bottom-nav');
  assert.deepEqual(result.delivery, ['css-mobile']);
  assert.equal(result.flags.coarse, true);
  assert.equal(result.flags.fine, false);
  assert.equal(result.flags.canHover, false);
});

test('resolve_device_tier: 1200dp fine -> desktop, 34px floor', () => {
  const { ok, result } = resolve_device_tier({
    width_dp: 1200, pointer: 'fine', hover: 'hover',
  });
  assert.equal(ok, true);
  assert.equal(result.tier, 'desktop');
  assert.equal(result.windowSizeClass, 'expanded');
  assert.equal(result.touchTargetMin, 34);
  assert.equal(result.navigation, 'sidebar');
  assert.equal(result.flags.coarse, false);
  assert.equal(result.flags.fine, true);
  assert.equal(result.flags.canHover, true);
});

test('resolve_device_tier: 1200dp coarse -> desktop WITH flags.coarse (never collapsed)', () => {
  const { ok, result } = resolve_device_tier({
    width_dp: 1200, pointer: 'coarse', hover: 'none',
  });
  assert.equal(ok, true);
  // Width class wins (M3 Expanded); coarse is a capability flag, not a tier.
  assert.equal(result.tier, 'desktop');
  assert.equal(result.flags.coarse, true);
  assert.equal(result.flags.fine, false);
});

test('resolve_device_tier: unknown pointer "stylus" -> error object, never a guess', () => {
  const res = resolve_device_tier({
    width_dp: 1200, pointer: 'stylus', hover: 'none',
  });
  assert.equal(res.ok, false);
  assert.equal(res.error.code, -32000);
  assert.match(res.error.message, /refusing to guess/);
  assert.match(res.error.message, /stylus/);
});

test('resolve_device_tier: unknown width "abc" -> error object, never a guess', () => {
  const res = resolve_device_tier({
    width_dp: 'abc', pointer: 'fine', hover: 'hover',
  });
  assert.equal(res.ok, false);
  assert.equal(res.error.code, -32000);
  assert.match(res.error.message, /widthDp must be a finite number/);
});

test('get_tier_tokens: embedded -> frozen manifest object verbatim', () => {
  const { ok, result } = get_tier_tokens({ tier: 'embedded' });
  assert.equal(ok, true);
  assert.equal(result.windowSizeClass, null);
  assert.equal(result.touchTargetMin, 44);
  assert.equal(result.navigation, 'minimal-html');
  assert.deepEqual(result.delivery, ['embedded-css', 'lvgl-c']);
});

test('get_tier_tokens: unknown tier -> error object naming the valid set', () => {
  const res = get_tier_tokens({ tier: 'foldable' });
  assert.equal(res.ok, false);
  assert.equal(res.error.code, -32000);
  assert.match(res.error.message, /valid: embedded, mobile, tablet, desktop/);
});