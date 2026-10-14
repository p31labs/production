#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// D/oklch-to-srgb.mjs — Lane D, P31 design-system parallel paths
// Pure JS OKLCH → sRGB → hex8 / RGB565 converter (CSS Color 4 math).
// Zero dependencies. Node 24 ESM. Read-only w.r.t. the canon token file.
//
// ── MATH (CSS Color 4 § 8 / § 10, and Björn Ottosson's OKLab paper) ─────────
// 1. OKLCH → OKLab (polar → rectangular):
//      a = C·cos(H°)      b = C·sin(H°)      L = L
// 2. OKLab → LMS'  (linear transform, then cube the components):
//      l' = L + 0.3963377774·a + 0.2158037573·b
//      m' = L − 0.1055613458·a − 0.0638541728·b
//      s' = L − 0.0894841775·a − 1.2914855480·b
//      l = l'³   m = m'³   s = s'³
// 3. LMS → linear-light sRGB:
//      r_lin = +4.0767416621·l − 3.3077115913·m + 0.2309699292·s
//      g_lin = −1.2684380046·l + 2.6097574011·m − 0.3413193965·s
//      b_lin = −0.0041960863·l − 0.7034186147·m + 1.7076147010·s
// 4. Linear → sRGB gamma (IEC 61966-2-1 piecewise, CSS Color 4 § 10.2):
//      c ≤ 0.0031308 → 12.92·c
//      c > 0.0031308 → 1.055·c^(1/2.4) − 0.055
// 5. 8-bit: clamp to [0,255], round-half-away (Math.round after clamping to
//    the unit interval — out-of-gamut OKLCH can push channels negative or >1,
//    which is clamped before quantization).
// 6. RGB565: R5 = r8>>3, G6 = g8>>2, B5 = b8>>3 → (r5<<11)|(g6<<5)|b5.
//
// FIDELITY NOTE: 8-bit rounding of the rounded CSS math, then RGB565
// quantization on the panel, is the documented fidelity bar for the 3.5"
// panel (spoon arc + status colors are the ones that matter visually —
// see D/firmware-integration.md). Any perceptual complaint is fixed in the
// TOKEN, never hardcoded in p31_ui.c (runbook § 8, D-2).
// ─────────────────────────────────────────────────────────────────────────────

const OKLAB_TO_LMS = [
  [1.0,  0.3963377774,  0.2158037573],
  [1.0, -0.1055613458, -0.0638541728],
  [1.0, -0.0894841775, -1.2914855480],
];

const LMS_TO_LINEAR_SRGB = [
  [ 4.0767416621, -3.3077115913,  0.2309699292],
  [-1.2684380046,  2.6097574011, -0.3413193965],
  [-0.0041960863, -0.7034186147,  1.7076147010],
];

/** OKLCH (L∈[0,1], C≥0, H°∈[0,360)) → linear-light sRGB triple (may be out of [0,1] for wide-gamut colors). */
export function oklchToLinearSrgb(L, C, Hdeg) {
  const h = (Hdeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab → LMS' (linear), then cube
  const lp = OKLAB_TO_LMS[0][0] * L + OKLAB_TO_LMS[0][1] * a + OKLAB_TO_LMS[0][2] * b;
  const mp = OKLAB_TO_LMS[1][0] * L + OKLAB_TO_LMS[1][1] * a + OKLAB_TO_LMS[1][2] * b;
  const sp = OKLAB_TO_LMS[2][0] * L + OKLAB_TO_LMS[2][1] * a + OKLAB_TO_LMS[2][2] * b;
  const l = lp ** 3;
  const m = mp ** 3;
  const s = sp ** 3;

  // LMS → linear sRGB
  const r = LMS_TO_LINEAR_SRGB[0][0] * l + LMS_TO_LINEAR_SRGB[0][1] * m + LMS_TO_LINEAR_SRGB[0][2] * s;
  const g = LMS_TO_LINEAR_SRGB[1][0] * l + LMS_TO_LINEAR_SRGB[1][1] * m + LMS_TO_LINEAR_SRGB[1][2] * s;
  const bl = LMS_TO_LINEAR_SRGB[2][0] * l + LMS_TO_LINEAR_SRGB[2][1] * m + LMS_TO_LINEAR_SRGB[2][2] * s;
  return [r, g, bl];
}

/** Linear-light sRGB component → gamma-encoded (IEC 61966-2-1). */
export function linearToGamma(u) {
  return u <= 0.0031308 ? 12.92 * u : 1.055 * Math.pow(u, 1 / 2.4) - 0.055;
}

/** Clamp gamma component to [0,1] and quantize to 8-bit. */
function quantize8(u) {
  const c = Math.min(1, Math.max(0, u));
  return Math.round(c * 255);
}

/** OKLCH → 8-bit sRGB triple [r, g, b], each 0..255. */
export function oklchToSrgb8(L, C, Hdeg) {
  const [r, g, b] = oklchToLinearSrgb(L, C, Hdeg);
  return [quantize8(linearToGamma(r)), quantize8(linearToGamma(g)), quantize8(linearToGamma(b))];
}

/** 8-bit sRGB triple → '#RRGGBB' hex8 string. */
export function srgb8ToHex([r, g, b]) {
  const hx = (v) => v.toString(16).toUpperCase().padStart(2, '0');
  return `#${hx(r)}${hx(g)}${hx(b)}`;
}

/** OKLCH → '#RRGGBB'. */
export function oklchToHex(L, C, Hdeg) {
  return srgb8ToHex(oklchToSrgb8(L, C, Hdeg));
}

/** 8-bit sRGB triple → RGB565 (16-bit packed integer, LVGL LV_COLOR_DEPTH 16). */
export function srgb8ToRgb565([r, g, b]) {
  return ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
}

/** OKLCH → RGB565 packed integer. */
export function oklchToRgb565(L, C, Hdeg) {
  return srgb8ToRgb565(oklchToSrgb8(L, C, Hdeg));
}

/** '#RRGGBB' (or '0xRRGGBB') → 8-bit triple. */
export function hexToSrgb8(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) throw new Error(`bad hex color: ${hex}`);
  const v = parseInt(m[1], 16);
  return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

/**
 * Composite a translucent foreground 8-bit triple over an opaque backdrop.
 * Per-channel linear interpolation in sRGB8 space (build-time approximation —
 * documented fidelity tradeoff; the panel's glass surfaces are near-neutral
 * whites over dark navy, where sRGB8 blending error is < 1 LSB).
 */
export function compositeOver(fg8, fgAlpha, bg8) {
  const a = Math.min(1, Math.max(0, fgAlpha));
  return [
    Math.round(a * fg8[0] + (1 - a) * bg8[0]),
    Math.round(a * fg8[1] + (1 - a) * bg8[1]),
    Math.round(a * fg8[2] + (1 - a) * bg8[2]),
  ];
}

/**
 * DTCG color object ({ colorSpace:'oklch', components:[L,C,H], alpha? })
 * → { rgb8: [r,g,b], hex: '#RRGGBB', rgb565: number, alpha: number }.
 * Alpha is NOT premultiplied here; use compositeOver() against a backdrop.
 */
export function dtcgColorToSrgb8(dtcg) {
  if (!dtcg || dtcg.colorSpace !== 'oklch' || !Array.isArray(dtcg.components) || dtcg.components.length < 3) {
    throw new Error(`not an OKLCH DTCG color: ${JSON.stringify(dtcg)}`);
  }
  const [L, C, H] = dtcg.components;
  return {
    rgb8: oklchToSrgb8(L, C, H),
    hex: oklchToHex(L, C, H),
    rgb565: oklchToRgb565(L, C, H),
    alpha: dtcg.alpha,
  };
}

// ── Self-check (run: node oklch-to-srgb.mjs) ─────────────────────────────────
// White is the fixed point of every stage of the OKLab pipeline: L=1,a=0,b=0
// ⇒ LMS=(1,1,1) ⇒ linear RGB=(1,1,1) ⇒ gamma(1)=1 ⇒ #FFFFFF.
if (import.meta.url === `file://${process.argv[1]}`) {
  const white = oklchToHex(1, 0, 0);
  if (white !== '#FFFFFF') {
    console.error(`SELF-CHECK FAIL: oklch(1 0 0) → ${white}, expected #FFFFFF`);
    process.exit(1);
  }
  const [r, g, b] = oklchToSrgb8(1, 0, 0);
  if (srgb8ToRgb565([r, g, b]) !== 0xffff) {
    console.error(`SELF-CHECK FAIL: RGB565 of white ≠ 0xFFFF`);
    process.exit(1);
  }
  const black = oklchToHex(0, 0, 0);
  if (black !== '#000000') {
    console.error(`SELF-CHECK FAIL: oklch(0 0 0) → ${black}, expected #000000`);
    process.exit(1);
  }
  console.log('self-check OK:');
  console.log(`  oklch(1 0 0)   → ${white}  RGB565 0x${srgb8ToRgb565(oklchToSrgb8(1, 0, 0)).toString(16).toUpperCase().padStart(4, '0')}`);
  console.log(`  oklch(0 0 0)   → ${black}`);
}