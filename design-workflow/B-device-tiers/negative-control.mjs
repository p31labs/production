/**
 * B/negative-control.mjs — NEGATIVE CONTROL (runbook §2.7, §6 B-2, Law 2).
 *
 * This file is a DELIBERATE SABOTAGE COPY of device-tiers.mjs. It must FAIL.
 * Do not "fix" it — a gate that cannot fail is furniture (P31 doctrine).
 *
 * The sabotage: the mixed-capability flag logic is broken — `flags.coarse`
 * is hardcoded false. A 1200px coarse+touch device silently loses its touch
 * capability: tier says desktop (correct), but the coarse flag collapses to
 * false, so a consumer applying the 34px floor would ship 34px targets on a
 * touch surface — the exact failure the runbook's negative control guards
 * against (runbook §6 B-2: "390px + pointer:fine must NOT silently resolve
 * to mobile-with-34px-targets; mixed capability must be surfaced").
 *
 * Proof-of-failure command:  node --test negative-control.mjs   -> exits 1
 * Then the REAL resolver passes the same assertion:
 *                           node --test device-tiers.test.mjs   -> exits 0
 *
 * Everything else in this copy is intentionally identical to the real
 * resolver, so the failure isolates EXACTLY the sabotaged logic.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import manifest from './device-tiers.json' with { type: 'json' };

const TIERS = manifest.tiers;
const MOBILE_MAX = TIERS.mobile.breakpointMaxDp;
const DESKTOP_MIN = TIERS.desktop.breakpointMinDp;
const POINTER_VALUES = new Set(['none', 'coarse', 'fine', 'mixed']);
const HOVER_VALUES = new Set(['none', 'hover', 'mixed']);

function assertWidth(widthDp) {
  if (typeof widthDp !== 'number' || Number.isNaN(widthDp)) {
    throw new TypeError(`widthDp must be a finite number, got ${JSON.stringify(widthDp)}`);
  }
  if (widthDp < 0) {
    throw new TypeError(`widthDp must be >= 0, got ${widthDp}`);
  }
}

function assertCapability(name, value, valid) {
  if (!valid.has(value)) {
    throw new TypeError(`unknown ${name} ${JSON.stringify(value)} — refusing to guess`);
  }
}

export function resolveDeviceTierBroken({ widthDp, pointer, hover }) {
  assertWidth(widthDp);
  assertCapability('pointer', pointer, POINTER_VALUES);
  assertCapability('hover', hover, HOVER_VALUES);

  let tier;
  if (widthDp < MOBILE_MAX) tier = 'mobile';
  else if (widthDp < DESKTOP_MIN) tier = 'tablet';
  else tier = 'desktop';

  const t = TIERS[tier];

  // ===== SABOTAGE BEGINS =====
  // The real resolver computes: coarse = pointer === 'coarse' || pointer === 'mixed'.
  // Here the coarse flag is hardcoded false — mixed capability collapses.
  const flags = {
    coarse: false, // BROKEN: coarse capability is silently discarded
    fine: pointer === 'fine' || pointer === 'mixed',
    canHover: hover === 'hover' || hover === 'mixed',
  };
  // ===== SABOTAGE ENDS =====

  return {
    tier,
    windowSizeClass: t.windowSizeClass,
    touchTargetMin: t.touchTargetMin,
    navigation: t.navigation,
    delivery: t.delivery,
    flags,
  };
}

// The SAME assertion the real gate runs (see device-tiers.test.mjs):
test('negative control: 1200px coarse/none must keep flags.coarse === true', () => {
  const r = resolveDeviceTierBroken({ widthDp: 1200, pointer: 'coarse', hover: 'none' });
  assert.equal(r.tier, 'desktop'); // tier classification is intact...
  assert.equal(r.flags.coarse, true); // ...but the capability flag MUST be surfaced. FAILS HERE.
});

test('control: width classification is untouched by the sabotage (this passes)', () => {
  assert.equal(
    resolveDeviceTierBroken({ widthDp: 700, pointer: 'coarse', hover: 'none' }).tier,
    'tablet',
  );
});