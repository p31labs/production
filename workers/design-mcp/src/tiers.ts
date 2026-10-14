/**
 * src/tiers.ts — device-tier tools for the canonical p31-design-mcp surface.
 *
 * THIN ADAPTER (Lane B precedent: brands.worker.ts is a mirror, not a source).
 * The values come from the canonical manifest — imported from
 * design-workflow/B-device-tiers/device-tiers.json (ONE SOURCE, Law 1) —
 * and the classification logic mirrors device-tiers.mjs semantics exactly:
 *
 *   widthDp <  600  -> mobile   (M3 Compact)
 *   600  <= w < 840  -> tablet   (M3 Medium)
 *   w     >= 840     -> desktop  (M3 Expanded)
 *
 * DOCTRINE: pointer/hover are INDEPENDENT capability flags — surfaced,
 * never collapsed. FAIL CLOSED: unknown/non-numeric input throws, never
 * guesses. Keep in lockstep with device-tiers.mjs (the parity discipline:
 * design-workflow/V6-E-fleet/registry-dispatch-parity.mjs).
 */

import manifest from '../../../design-workflow/B-device-tiers/device-tiers.json';

export const MANIFEST = manifest;
export const TIERS = manifest.tiers;

const POINTER_VALUES = new Set(['none', 'coarse', 'fine', 'mixed']);
const HOVER_VALUES = new Set(['none', 'hover', 'mixed']);

const MOBILE_MAX = TIERS.mobile.breakpointMaxDp; // 600
const DESKTOP_MIN = TIERS.desktop.breakpointMinDp; // 840

function assertWidth(widthDp: unknown): asserts widthDp is number {
  if (typeof widthDp !== 'number' || Number.isNaN(widthDp)) {
    throw new TypeError(`resolve_device_tier: widthDp must be a finite number, got ${JSON.stringify(widthDp)}`);
  }
  if (widthDp < 0) {
    throw new TypeError(`resolve_device_tier: widthDp must be >= 0, got ${widthDp}`);
  }
}

function assertCapability(name: string, value: unknown, valid: Set<string>): asserts value is string {
  if (typeof value !== 'string' || !valid.has(value)) {
    throw new TypeError(
      `resolve_device_tier: ${name} must be one of ${[...valid].map((v) => JSON.stringify(v)).join(' | ')}, got ${JSON.stringify(value)} (unknown capability — refusing to guess)`,
    );
  }
}

export function resolveDeviceTier(input: { widthDp: number; pointer: string; hover: string }) {
  const { widthDp, pointer, hover } = input;
  assertWidth(widthDp);
  assertCapability('pointer', pointer, POINTER_VALUES);
  assertCapability('hover', hover, HOVER_VALUES);

  const tier = widthDp < MOBILE_MAX ? 'mobile' : widthDp < DESKTOP_MIN ? 'tablet' : 'desktop';
  const t = TIERS[tier as 'mobile' | 'tablet' | 'desktop'];
  return {
    tier,
    windowSizeClass: t.windowSizeClass,
    touchTargetMin: t.touchTargetMin,
    navigation: t.navigation,
    delivery: t.delivery,
    safeAreaInsets: t.safeAreaInsets,
    flags: {
      coarse: pointer === 'coarse' || pointer === 'mixed',
      fine: pointer === 'fine' || pointer === 'mixed',
      canHover: hover === 'hover' || hover === 'mixed',
    },
  };
}

export function resolveEmbedded() {
  return TIERS.embedded;
}

export function getTierTokens(tier: string) {
  const known = ['embedded', 'mobile', 'tablet', 'desktop'];
  if (!known.includes(tier)) {
    throw new TypeError(`get_tier_tokens: tier must be one of ${known.join(' | ')}, got ${JSON.stringify(tier)} (unknown tier — refusing to guess)`);
  }
  const t = TIERS[tier as keyof typeof TIERS];
  // Token VALUES resolve via the canonical token_resolve tool; this returns
  // the tier contract + which delivery surfaces carry the tier's tokens.
  return {
    tier,
    touchTargetMin: t.touchTargetMin,
    navigation: t.navigation,
    delivery: t.delivery,
    safeAreaInsets: t.safeAreaInsets,
    note: 'Token values for this tier resolve via token_resolve / list_tokens_dtc.',
  };
}