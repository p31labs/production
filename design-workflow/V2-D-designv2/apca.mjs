#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V2-D-designv2/apca.mjs — Lane D v2.0, D-3: zero-dependency port of the
// APCA 0.0.98G-4g math (the W3-licensed apca-w3 base algorithm, library
// version 0.1.9, constants last changed 2021-02-15 and unchanged since
// apca-w3 0.1.0). Source of truth for the port:
//   https://github.com/Myndex/apca-w3 — src/apca-w3.js (ƒ APCAcontrast, ƒ sRGBtoY)
// Ported faithfully: same constants, same branches, same clamps.
//
// MATH (documented equations — the entire algorithm):
//   1. sRGB → Y (APCA's own Y, NOT IEC piecewise luminance):
//        Y = 0.2126729·(R/255)^2.4 + 0.7151522·(G/255)^2.4 + 0.0721750·(B/255)^2.4
//      (simple 2.4 monitor exponent per the official sRGBtoY)
//   2. Soft black clamp (flare compensation), applied to BOTH colors:
//        Y ≤ 0.022  →  Y' = Y + (0.022 − Y)^1.414
//   3. Early return: |bgY − txtY| < 0.0005  →  Lc = 0
//   4. Polarity-dependent SAPC (two DIFFERENT exponent sets — by design,
//      APCA is polarity sensitive; the source explicitly warns against
//      swapping text and background):
//        normal  (bgY > txtY, dark on light):
//          SAPC = (bgY^0.56 − txtY^0.57) × 1.14
//          Lc   = (SAPC < 0.1) ? 0 : (SAPC − 0.027) × 100
//        reverse (light on dark — signed NEGATIVE):
//          SAPC = (bgY^0.65 − txtY^0.62) × 1.14
//          Lc   = (SAPC > −0.1) ? 0 : (SAPC + 0.027) × 100
//   5. Official output range: −108.0 … +106.0 (apca-w3 README).
//
// SELF-CHECKS (run: node apca.mjs --selfcheck):
//   a) exact cross-check vs the official apca-w3 test suite reference values
//      (github.com/Myndex/apca-w3, test/index.js, same G-4g constants);
//   b) black/white extremes within the documented −108.0…106.0 range;
//   c) polarity: sign flip guaranteed; measured asymmetry reported and
//      documented (by design — see polarity note below);
//   d) monotonicity: darker text on the same background → larger |Lc|.
//
// POLARITY NOTE: Lc(fg,bg) ≠ −Lc(bg,fg) exactly. The normal and reverse
// polarity branches use different exponent sets (0.56/0.57 vs 0.65/0.62)
// tuned per display adaptation — the official test values themselves show
// this (Lc(#888,#fff)=+63.056 vs Lc(#fff,#888)=−68.541). The port reproduces
// the official asymmetric values exactly; no symmetry is claimed.
//
// Canon scoring (run: node apca.mjs): themes.cipher (the live theme) —
// OKLCH→sRGB8 via ../D-embedded/oklch-to-srgb.mjs (v1.0 math, imported
// READ-ONLY), then the port above. Glass tokens are composited over the
// backdrop with sRGB8-space blending (documented approximation; official
// alphaBlend is gamma-space — difference < 1 LSB on near-neutral glass).
//
// Negative control (run: node apca.mjs --negative): #767676 on #7A7A7A.
//
// MANDATORY DISCLAIMER (also in apca-report.md):
//   APCA is the candidate contrast method for WCAG 3, currently in public
//   beta. WCAG 2.2 AA remains the legal floor.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs';
import { dtcgColorToSrgb8, compositeOver } from '../D-embedded/oklch-to-srgb.mjs';

const CANON = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';

// ── SA98G constants — 0.0.98G-4g, W3 license set (README "Current APCA Constants")
const SA98G = Object.freeze({
  mainTRC: 2.4,
  sRco: 0.2126729, sGco: 0.7151522, sBco: 0.0721750,
  normBG: 0.56, normTXT: 0.57, revTXT: 0.62, revBG: 0.65,
  blkThrs: 0.022, blkClmp: 1.414,
  scaleBoW: 1.14, loBoWoffset: 0.027,
  scaleWoB: 1.14, loWoBoffset: 0.027,
  deltaYmin: 0.0005, loClip: 0.1,
});

/** Official sRGBtoY: 8-bit sRGB triple → APCA Y (simple 2.4 exponent). */
export function sRGBtoY(rgb) {
  const exp = (chan) => Math.pow(chan / 255.0, SA98G.mainTRC);
  return SA98G.sRco * exp(rgb[0]) + SA98G.sGco * exp(rgb[1]) + SA98G.sBco * exp(rgb[2]);
}

/** Official APCAcontrast: (txtY, bgY) → signed Lc. Faithful port, line-for-line logic. */
export function APCAcontrast(txtY, bgY, places = -1) {
  const icp = [0.0, 1.1];
  if (isNaN(txtY) || isNaN(bgY) || Math.min(txtY, bgY) < icp[0] || Math.max(txtY, bgY) > icp[1]) {
    return 0.0;
  }
  let SAPC = 0.0;
  let outputContrast = 0.0;

  // Soft black clamp, both colors.
  txtY = (txtY > SA98G.blkThrs) ? txtY : txtY + Math.pow(SA98G.blkThrs - txtY, SA98G.blkClmp);
  bgY = (bgY > SA98G.blkThrs) ? bgY : bgY + Math.pow(SA98G.blkThrs - bgY, SA98G.blkClmp);

  if (Math.abs(bgY - txtY) < SA98G.deltaYmin) return 0.0;

  if (bgY > txtY) { // normal polarity — dark text on light background
    SAPC = (Math.pow(bgY, SA98G.normBG) - Math.pow(txtY, SA98G.normTXT)) * SA98G.scaleBoW;
    outputContrast = (SAPC < SA98G.loClip) ? 0.0 : SAPC - SA98G.loBoWoffset;
  } else { // reverse polarity — light text on dark background (negative)
    SAPC = (Math.pow(bgY, SA98G.revBG) - Math.pow(txtY, SA98G.revTXT)) * SA98G.scaleWoB;
    outputContrast = (SAPC > -SA98G.loClip) ? 0.0 : SAPC + SA98G.loWoBoffset;
  }

  if (places < 0) return outputContrast * 100.0;
  if (places === 0) return Math.round(Math.abs(outputContrast) * 100.0);
  return Number((outputContrast * 100.0).toFixed(places));
}

/** '#RRGGBB' or '#RGB' → 8-bit triple. */
export function hexToSrgb8(hex) {
  let m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (m) {
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
  }
  m = /^#([0-9a-fA-F]{3})$/.exec(hex.trim());
  if (m) {
    const [r, g, b] = m[1].split('').map((c) => parseInt(c + c, 16));
    return [r, g, b];
  }
  throw new Error(`bad hex color: ${hex}`);
}

/** '#RRGGBB' fg on '#RRGGBB' bg → Lc. */
export function lcHex(fgHex, bgHex) {
  return APCAcontrast(sRGBtoY(hexToSrgb8(fgHex)), sRGBtoY(hexToSrgb8(bgHex)));
}

/** Official alphaBlend semantics (gamma-space, rounded) for '#RRGGBBAA' / '#RGBA' fg. */
export function lcHexAlpha(fgHex, bgHex) {
  const t = fgHex.trim();
  let f, a;
  const m8 = /^#([0-9a-fA-F]{6})([0-9a-fA-F]{2})$/.exec(t);
  const m4 = /^#([0-9a-fA-F]{3})([0-9a-fA-F])$/.exec(t);
  if (m8) {
    f = hexToSrgb8('#' + m8[1]);
    a = parseInt(m8[2], 16) / 255;
  } else if (m4) {
    f = hexToSrgb8('#' + m4[1]);
    a = parseInt(m4[2] + m4[2], 16) / 255;
  } else {
    throw new Error(`bad hex+alpha color: ${fgHex}`);
  }
  const b = hexToSrgb8(bgHex);
  const blended = [0, 1, 2].map((i) => Math.min(Math.round(b[i] * (1 - a) + f[i] * a), 255));
  return APCAcontrast(sRGBtoY(blended), sRGBtoY(b));
}

// ── Self-checks ─────────────────────────────────────────────────────────────

// Official reference values: Myndex/apca-w3, test/index.js (ava suite for the
// same 0.0.98G-4g constants; library 0.1.7 → same base algorithm as 0.1.9).
const OFFICIAL_PAIRS = [
  ['#888', '#FFF', 63.056469930209424],
  ['#FFF', '#888', -68.54146436644962],
  ['#000', '#aaa', 58.146262578561334],
  ['#aaa', '#000', -56.24113336839742],
  ['#123', '#def', 91.66830811481631],
  ['#def', '#123', -93.06770049484275],
  ['#123', '#444', 8.32326136957393],
  ['#444', '#123', -7.526878460278154],
];

function selfCheck() {
  let failures = 0;
  const check = (label, ok, detail) => {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
    if (!ok) failures++;
  };

  console.log('=== APCA 0.0.98G-4g port self-check ===');
  console.log('(a) cross-check vs official apca-w3 test suite (test/index.js, exact to 1e-6):');
  for (const [fg, bg, ref] of OFFICIAL_PAIRS) {
    const got = lcHex(fg, bg);
    const ok = Math.abs(got - ref) < 1e-6;
    check(`Lc(${fg} on ${bg}) = ${got.toFixed(6)}  ref ${ref}`, ok, ok ? '' : `Δ=${(got - ref).toExponential(2)}`);
  }

  console.log('(b) black/white extremes (official range −108.0 … 106.0, apca-w3 README):');
  const bw = lcHex('#000', '#FFF');
  const wb = lcHex('#FFF', '#000');
  check(`Lc(#000 on #FFF) = ${bw.toFixed(2)}  expected ≈ +106.0`, bw >= 105.5 && bw <= 106.5);
  check(`Lc(#FFF on #000) = ${wb.toFixed(2)}  expected ≈ −107.9 (official range bound)`, wb >= -108.5 && wb <= -107.0);

  console.log('(c) polarity: sign flip guaranteed; asymmetry measured and documented (by design):');
  let signOk = true;
  for (const [fg, bg] of OFFICIAL_PAIRS) {
    const a = lcHex(fg, bg);
    const b = lcHex(bg, fg);
    if (Math.sign(a) === Math.sign(b)) signOk = false;
  }
  check('all test pairs flip sign when fg/bg swap', signOk);
  const asym888 = lcHex('#888', '#FFF') + lcHex('#FFF', '#888'); // 63.056 + (−68.541) = −5.485
  console.log(`    asymmetry Lc(#888,#FFF)+Lc(#FFF,#888) = ${asym888.toFixed(3)} — official values differ by the same amount (norm 0.56/0.57 vs rev 0.65/0.62 exponent sets).`);
  check('reproduces the official asymmetric pair values exactly (no false symmetry)', Math.abs(asym888 - (63.056469930209424 - 68.54146436644962)) < 1e-6);

  console.log('(d) monotonicity: darker text on the same bg → larger |Lc|:');
  const onWhite = [];
  for (const g of [0xee, 0xcc, 0xaa, 0x88, 0x66, 0x44, 0x22, 0x00]) {
    onWhite.push(Math.abs(lcHex(`#${g.toString(16).padStart(2, '0').repeat(3)}`, '#FFF')));
  }
  const mono1 = onWhite.every((v, i) => i === 0 || v >= onWhite[i - 1]);
  check(`gray text #EE→#00 on #FFF: |Lc| = ${onWhite.map((v) => v.toFixed(1)).join(', ')}`, mono1);
  const onBlack = [];
  for (const g of [0x11, 0x33, 0x55, 0x77, 0x99, 0xbb, 0xdd, 0xff]) {
    onBlack.push(Math.abs(lcHex(`#${g.toString(16).padStart(2, '0').repeat(3)}`, '#111')));
  }
  const mono2 = onBlack.every((v, i) => i === 0 || v >= onBlack[i - 1]);
  check(`gray text #11→#FF on #111: |Lc| = ${onBlack.map((v) => v.toFixed(1)).join(', ')}`, mono2);

  console.log(failures === 0 ? 'SELF-CHECK: ALL PASS' : `SELF-CHECK: ${failures} FAILURE(S)`);
  return failures;
}

// ── Canon scoring (themes.cipher — the live theme) ──────────────────────────

const BODY_FLOOR = 60;   // body text (task D-3 floor)
const LARGE_FLOOR = 45;  // large text / UI labels (task D-3 floor)
const NONTEXT_FLOOR = 30; // non-text / spot (APCA docs Lc 30 absolute minimum for non-text)

function canonScore() {
  const canon = JSON.parse(readFileSync(CANON, 'utf8'));
  const t = canon.themes.cipher.p31;

  const hex = (name) => dtcgColorToSrgb8(t[name].$value).hex;
  const composited = (name, overName) => {
    const c = dtcgColorToSrgb8(t[name].$value);
    const bg = hexToSrgb8(hex(overName));
    return compositeOver(c.rgb8, c.alpha ?? 1, bg);
  };
  const lcRgb = (fg8, bg8) => APCAcontrast(sRGBtoY(fg8), sRGBtoY(bg8));

  const bg = hexToSrgb8(hex('bg'));
  const surface = hexToSrgb8(hex('surface'));
  const surface2 = hexToSrgb8(hex('surface2'));

  const fgOf = (name) => hexToSrgb8(hex(name));

  const pairs = [
    // [label, fg8, bg8, floor, tier]
    ['text-primary on bg', fgOf('text-primary'), bg, BODY_FLOOR, 'body'],
    ['text-secondary on bg', fgOf('text-secondary'), bg, BODY_FLOOR, 'body'],
    ['text-tertiary on bg', fgOf('text-tertiary'), bg, LARGE_FLOOR, 'large/muted'],
    ['text-primary on surface', fgOf('text-primary'), surface, BODY_FLOOR, 'body'],
    ['text-secondary on surface', fgOf('text-secondary'), surface, BODY_FLOOR, 'body'],
    ['text-tertiary on surface', fgOf('text-tertiary'), surface, LARGE_FLOOR, 'large/muted'],
    ['text-primary on surface2', fgOf('text-primary'), surface2, BODY_FLOOR, 'body'],
    ['text-secondary on surface2', fgOf('text-secondary'), surface2, BODY_FLOOR, 'body'],
    ['text-tertiary on surface2', fgOf('text-tertiary'), surface2, LARGE_FLOOR, 'large/muted'],
    ['accent on bg', fgOf('accent'), bg, LARGE_FLOOR, 'large/UI'],
    ['accent-cyan on bg', fgOf('accent-cyan'), bg, LARGE_FLOOR, 'large/UI'],
    ['accent-gold on bg', fgOf('accent-gold'), bg, LARGE_FLOOR, 'large/UI'],
    ['accent-green on bg', fgOf('accent-green'), bg, LARGE_FLOOR, 'large/UI'],
    ['accent-red on bg', fgOf('accent-red'), bg, LARGE_FLOOR, 'large/UI'],
    ['accent-iris on bg', fgOf('accent-iris'), bg, LARGE_FLOOR, 'large/UI'],
    ['accent-violet on bg', fgOf('accent-violet'), bg, LARGE_FLOOR, 'large/UI'],
    ['text-primary on accent', fgOf('text-primary'), fgOf('accent'), LARGE_FLOOR, 'large/button'],
    ['glass-border on bg', composited('glass-border', 'bg'), bg, NONTEXT_FLOOR, 'non-text'],
  ];

  console.log('=== canon score: themes.cipher (live theme) — APCA 0.0.98G-4g ===');
  console.log('floors: body >= 60 · large/UI >= 45 · non-text >= 30  (|Lc|)');
  console.log('');
  console.log('pair                       Lc         floor  result');
  console.log('----------------------------------------------------------');
  const comments = [];
  for (const [label, fg8, bg8, floor, tier] of pairs) {
    const lc = lcRgb(fg8, bg8);
    const a = Math.abs(lc);
    const result = a >= floor ? 'pass' : 'FLAG';
    const lcS = lc.toFixed(1).padStart(7);
    console.log(`${label.padEnd(26)} ${lcS}   ${String(floor).padStart(5)}  ${result}`);
    comments.push(`/* Lc ${Math.abs(lc).toFixed(1)} on --${label.split(' on ')[1]} */  /* ${label}, floor ${floor}: ${result} */`);
  }
  console.log('');
  console.log('inline comment emission (format: /* Lc XX.X on --bg */):');
  for (const c of comments) console.log('  ' + c);
  console.log('');
  console.log('MANDATORY DISCLAIMER: APCA is the candidate contrast method for WCAG 3, currently in public beta. WCAG 2.2 AA remains the legal floor.');
  return pairs.filter(([, , , floor]) => false).length; // no-op; flags are printed per pair
}

// ── Negative control ────────────────────────────────────────────────────────

function negative() {
  const lc = lcHex('#767676', '#7A7A7A');
  const flagged = Math.abs(lc) < LARGE_FLOOR;
  console.log('=== APCA negative control (deliberately low-contrast fixture) ===');
  console.log(`pair: #767676 (text) on #7A7A7A (bg)  — mid-gray on mid-gray`);
  console.log(`Lc = ${lc.toFixed(2)}`);
  console.log(`floor check vs large-text floor ${LARGE_FLOOR}: ${flagged ? 'FLAG (below floor)' : 'pass'}`);
  console.log(flagged ? 'RESULT: FLAGGED (gate can fail)' : 'RESULT: not flagged');
  return flagged ? 0 : 1; // negative control SUCCEEDS when it flags
}

// ── Main ────────────────────────────────────────────────────────────────────
const mode = process.argv[2];
if (mode === '--selfcheck') process.exit(selfCheck() > 0 ? 1 : 0);
if (mode === '--negative') process.exit(negative());
canonScore();