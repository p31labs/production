/**
 * B/device-tiers.test.mjs — tier-resolver gate (runbook §6 B-2, gates table row
 * "tier-resolver"). Run: `node --test` (or `node --test device-tiers.test.mjs`).
 *
 * Assertions per runbook §6 B-2 verify list:
 *   390px coarse -> mobile; 700px coarse -> tablet; 1200px fine+hover -> desktop.
 * Negative control covered here as an ASSERTION: mixed capability must be
 * surfaced, never collapsed — the provable failure lives in negative-control.mjs.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveDeviceTier, resolveEmbedded, TIERS } from './device-tiers.mjs';
import breakpoints from './breakpoints.tokens.json' with { type: 'json' };

test('390px coarse/none resolves to mobile with 44px floor and coarse flag', () => {
  const r = resolveDeviceTier({ widthDp: 390, pointer: 'coarse', hover: 'none' });
  assert.equal(r.tier, 'mobile');
  assert.equal(r.windowSizeClass, 'compact');
  assert.equal(r.touchTargetMin, 44);
  assert.equal(r.navigation, 'bottom-nav');
  assert.deepEqual(r.delivery, ['css-mobile']);
  assert.deepEqual(r.flags, { coarse: true, fine: false, canHover: false });
});

test('700px coarse/none resolves to tablet', () => {
  const r = resolveDeviceTier({ widthDp: 700, pointer: 'coarse', hover: 'none' });
  assert.equal(r.tier, 'tablet');
  assert.equal(r.windowSizeClass, 'medium');
  assert.equal(r.touchTargetMin, 44);
  assert.equal(r.navigation, 'nav-rail');
  assert.deepEqual(r.delivery, ['css-full']);
  assert.deepEqual(r.flags, { coarse: true, fine: false, canHover: false });
});

test('1200px fine/hover resolves to desktop with 34px floor', () => {
  const r = resolveDeviceTier({ widthDp: 1200, pointer: 'fine', hover: 'hover' });
  assert.equal(r.tier, 'desktop');
  assert.equal(r.windowSizeClass, 'expanded');
  assert.equal(r.touchTargetMin, 34);
  assert.equal(r.navigation, 'sidebar');
  assert.deepEqual(r.delivery, ['css-full']);
  assert.deepEqual(r.flags, { coarse: false, fine: true, canHover: true });
});

test('negative-control assertion: 1200px coarse/none is desktop WITH flags.coarse true (never collapsed)', () => {
  // THE TENSION: tier says desktop + 34px floor, but the capability is coarse.
  // The resolver must NOT collapse coarse into fine — it surfaces the flag so
  // the consumer applies the 44px floor (WCAG 2.5.5) despite the tier default.
  // If flags.coarse ever comes back false here, the tier-resolver gate FAILS
  // (demonstrated deliberately in negative-control.mjs).
  const r = resolveDeviceTier({ widthDp: 1200, pointer: 'coarse', hover: 'none' });
  assert.equal(r.tier, 'desktop');
  assert.equal(r.touchTargetMin, 34); // tier default — the tension lives here
  assert.equal(r.flags.coarse, true); // capability surfaced, not collapsed
  assert.equal(r.flags.fine, false);
  assert.equal(r.flags.canHover, false);
});

test('mixed capability never collapses: 1200px mixed/mixed keeps BOTH coarse and fine', () => {
  const r = resolveDeviceTier({ widthDp: 1200, pointer: 'mixed', hover: 'mixed' });
  assert.equal(r.tier, 'desktop');
  assert.deepEqual(r.flags, { coarse: true, fine: true, canHover: true });
});

test('390px fine/hover stays mobile — pointer never overrides the width class', () => {
  // A small fine-pointer surface is still compact (runbook §2.5: touch is
  // capability, window class is width — they are separate axes).
  const r = resolveDeviceTier({ widthDp: 390, pointer: 'fine', hover: 'hover' });
  assert.equal(r.tier, 'mobile');
  assert.equal(r.windowSizeClass, 'compact');
  assert.deepEqual(r.flags, { coarse: false, fine: true, canHover: true });
});

test('window size class boundaries: 599 mobile / 600 tablet / 839 tablet / 840 desktop', () => {
  const at = (w) => resolveDeviceTier({ widthDp: w, pointer: 'coarse', hover: 'none' }).tier;
  assert.equal(at(599.99), 'mobile');
  assert.equal(at(600), 'tablet'); // M3: Medium starts at 600
  assert.equal(at(839), 'tablet');
  assert.equal(at(840), 'desktop'); // M3: Expanded starts at 840
});

test('resolveEmbedded returns the explicit hardware context (Node Zero)', () => {
  const r = resolveEmbedded();
  assert.equal(r.tier, 'embedded');
  assert.equal(r.windowSizeClass, null);
  assert.equal(r.touchTargetMin, 44);
  assert.equal(r.navigation, 'minimal-html');
  assert.deepEqual(r.delivery, ['embedded-css', 'lvgl-c']);
  // Not reported (no media query on the LVGL panel) -> null, not false.
  assert.deepEqual(r.flags, { coarse: null, fine: null, canHover: null });
});

test('throws TypeError on negative width', () => {
  assert.throws(
    () => resolveDeviceTier({ widthDp: -1, pointer: 'coarse', hover: 'none' }),
    TypeError,
  );
});

test('throws TypeError on non-numeric width', () => {
  assert.throws(
    () => resolveDeviceTier({ widthDp: 'abc', pointer: 'coarse', hover: 'none' }),
    TypeError,
  );
  assert.throws(
    () => resolveDeviceTier({ widthDp: NaN, pointer: 'coarse', hover: 'none' }),
    TypeError,
  );
  assert.throws(
    () => resolveDeviceTier({ widthDp: undefined, pointer: 'coarse', hover: 'none' }),
    TypeError,
  );
});

test('throws TypeError on unknown pointer/hover values — refuses to guess', () => {
  assert.throws(
    () => resolveDeviceTier({ widthDp: 390, pointer: 'banana', hover: 'none' }),
    TypeError,
  );
  assert.throws(
    () => resolveDeviceTier({ widthDp: 390, pointer: 'coarse', hover: 'banana' }),
    TypeError,
  );
});

test('integrity: resolver output is derived from the manifest (one source)', () => {
  // Every returned tier value must equal the manifest — the resolver never
  // re-declares the contract (ONE SOURCE, runbook Law 1).
  for (const [tier, w] of [['mobile', 390], ['tablet', 700], ['desktop', 1200]]) {
    const r = resolveDeviceTier({ widthDp: w, pointer: 'coarse', hover: 'none' });
    const m = TIERS[tier];
    assert.equal(r.windowSizeClass, m.windowSizeClass);
    assert.equal(r.touchTargetMin, m.touchTargetMin);
    assert.equal(r.navigation, m.navigation);
    assert.deepEqual(r.delivery, m.delivery);
  }
});

test('integrity: breakpoint tokens agree with the manifest bounds', () => {
  const px = (s) => Number.parseFloat(s);
  assert.equal(px(breakpoints.breakpoint.compact.$value), TIERS.mobile.breakpointMaxDp);
  assert.equal(px(breakpoints.breakpoint.medium.$value), TIERS.tablet.breakpointMaxDp);
  // rem conversions at 16px root: 600->37.5, 840->52.5, 1200->75.
  assert.equal(breakpoints.breakpoint.compact.$extensions.remValue, '37.5rem');
  assert.equal(breakpoints.breakpoint.medium.$extensions.remValue, '52.5rem');
  assert.equal(breakpoints.breakpoint.expanded.$extensions.remValue, '75rem');
});