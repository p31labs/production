/**
 * B/device-tiers.mjs — P31 device-tier resolver (pure ESM, zero dependencies).
 *
 * Maps CAPABILITY to tier, never device brand (runbook §6 B-2).
 *   widthDp <  600          -> mobile  (M3 Compact)
 *   600  <= widthDp <  840  -> tablet  (M3 Medium)
 *   widthDp >= 840          -> desktop (M3 Expanded)
 *
 * DOCTRINE: pointer/hover are INDEPENDENT capability flags. They never
 * override the width class and never collapse. A 1200px coarse+touch device
 * is tier `desktop` WITH flags.coarse === true (runbook §2.5, §6 B-2
 * negative control). Consumers must reconcile tier touchTargetMin against
 * flags: when flags.coarse is true, apply the 44px floor regardless of tier.
 *
 * FAIL CLOSED (runbook §11.10): non-numeric/negative width, or an unknown
 * pointer/hover value, throws TypeError — never a guess.
 *
 * Single source of truth: all tier values come from ./device-tiers.json
 * (the manifest is the contract; this module reads it, never re-declares it).
 *
 * Valid input values (browser media-query vocabulary + platform 'mixed'):
 *   pointer: "none" | "coarse" | "fine" | "mixed"
 *   hover:   "none" | "hover" | "mixed"
 */

import manifest from './device-tiers.json' with { type: 'json' };

/** Frozen full manifest for introspection (the contract itself). */
export const MANIFEST = Object.freeze(manifest);

/** Frozen per-tier objects for introspection. */
export const TIERS = Object.freeze(manifest.tiers);

const POINTER_VALUES = new Set(['none', 'coarse', 'fine', 'mixed']);
const HOVER_VALUES = new Set(['none', 'hover', 'mixed']);

// Classification bounds are DERIVED from the manifest, not re-declared,
// so the resolver can never drift from the contract (ONE SOURCE, Law 1).
const MOBILE_MAX = TIERS.mobile.breakpointMaxDp; // 600
const DESKTOP_MIN = TIERS.desktop.breakpointMinDp; // 840

function assertWidth(widthDp) {
  if (typeof widthDp !== 'number' || Number.isNaN(widthDp)) {
    throw new TypeError(
      `resolveDeviceTier: widthDp must be a finite number, got ${JSON.stringify(widthDp)}`,
    );
  }
  if (widthDp < 0) {
    throw new TypeError(
      `resolveDeviceTier: widthDp must be >= 0, got ${widthDp}`,
    );
  }
}

function assertCapability(name, value, valid) {
  if (!valid.has(value)) {
    throw new TypeError(
      `resolveDeviceTier: ${name} must be one of ${[...valid].map((v) => JSON.stringify(v)).join(' | ')}, got ${JSON.stringify(value)} (unknown capability — refusing to guess)`,
    );
  }
}

/**
 * Resolve the delivery tier for a web-capable surface.
 *
 * @param {{widthDp: number, pointer: string, hover: string}} input
 * @returns {{
 *   tier: 'mobile'|'tablet'|'desktop',
 *   windowSizeClass: 'compact'|'medium'|'expanded',
 *   touchTargetMin: number,
 *   navigation: string,
 *   delivery: string[],
 *   flags: {coarse: boolean, fine: boolean, canHover: boolean},
 * }}
 * @throws {TypeError} on non-numeric/negative width or unknown pointer/hover.
 */
export function resolveDeviceTier({ widthDp, pointer, hover }) {
  assertWidth(widthDp);
  assertCapability('pointer', pointer, POINTER_VALUES);
  assertCapability('hover', hover, HOVER_VALUES);

  let tier;
  if (widthDp < MOBILE_MAX) tier = 'mobile';
  else if (widthDp < DESKTOP_MIN) tier = 'tablet';
  else tier = 'desktop';

  const t = TIERS[tier];

  // Capability flags: independent of the width class, never collapsed.
  // 'mixed' means BOTH capabilities are present (e.g. the Spin 713 2-in-1).
  const flags = {
    coarse: pointer === 'coarse' || pointer === 'mixed',
    fine: pointer === 'fine' || pointer === 'mixed',
    canHover: hover === 'hover' || hover === 'mixed',
  };

  return {
    tier,
    windowSizeClass: t.windowSizeClass,
    touchTargetMin: t.touchTargetMin,
    navigation: t.navigation,
    delivery: t.delivery,
    flags,
  };
}

/**
 * Resolve the embedded tier — an EXPLICIT hardware context (Node Zero,
 * ESP32-S3 + LVGL 8.4 panel). There is no browser viewport and no
 * pointer/hover media query on the panel, so the capability flags are null
 * (not reported) rather than false (absent). Callers must opt in explicitly;
 * resolveDeviceTier never falls through to embedded.
 *
 * @returns {{tier: 'embedded', windowSizeClass: null, touchTargetMin: number,
 *   navigation: string, delivery: string[],
 *   flags: {coarse: null, fine: null, canHover: null}}}
 */
export function resolveEmbedded() {
  const e = TIERS.embedded;
  return {
    tier: 'embedded',
    windowSizeClass: e.windowSizeClass, // null — not a viewport
    touchTargetMin: e.touchTargetMin,
    navigation: e.navigation,
    delivery: [...e.delivery],
    flags: { coarse: null, fine: null, canHover: null },
  };
}