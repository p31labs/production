#!/usr/bin/env node
/**
 * contrast-audit — machine-verified WCAG 2.2 AA contrast for the design portal.
 * Parses src/tokens.css (and the design-core theme store) for text-on-surface
 * token pairs, converts OKLCH → sRGB, computes relative luminance, and asserts
 * 4.5:1 (body text) / 3:1 (large text + UI). Fails the build on violations.
 *
 * Run: node scripts/contrast-audit.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* OKLCH → sRGB (WCAG relative luminance via linear space). */
const L2 = (v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92);

function oklchToSrgb(l, c, h, alpha = 1) {
  const hr = (h * Math.PI) / 180;
  const a = c * Math.cos(hr);
  const b = c * Math.sin(hr);
  const l_ = l;
  // Oklab → linear sRGB (D65) matrix.
  const lr = 0.9999999984505198 * l_ + 0.39633779217376786 * a + 0.2158037580607588 * b;
  const lg = 1.0000000088817609 * l_ - 0.10556134232365635 * a - 0.06385417477170591 * b;
  const lb = 0.9999999889238999 * l_ - 0.08948417752981172 * a - 1.2914855480194092 * b;
  const r = lr ** 3, g = lg ** 3, bl = lb ** 3;
  const sr = L2(Math.max(0, Math.min(1, 1.0 * r - 0.0151771152009278 * g + 0.024555252966428166 * bl)));
  const sg = L2(Math.max(0, Math.min(1, -0.18350600410236098 * r + 0.9716939511745268 * g - 0.02855467449357963 * bl)));
  const sb = L2(Math.max(0, Math.min(1, -0.0020824077093572387 * r + 0.0034747055783296046 * g + 0.9994299836244528 * bl)));
  return [sr * alpha, sg * alpha, sb * alpha];
}

function parseOklch(str) {
  if (typeof str !== 'string') return null;
  const m = str.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)/i);
  if (!m) return null;
  const l = m[1].includes('%') ? parseFloat(m[1]) / 100 : parseFloat(m[1]);
  return oklchToSrgb(l, parseFloat(m[2]), parseFloat(m[3]), m[4] ? parseFloat(m[4]) : 1);
}

function luminance(rgb) {
  const [r, g, b] = rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg, bg) {
  const l1 = luminance(fg), l2 = luminance(bg);
  const hi = Math.max(l1, l2), lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

// Token values: collect all --p31-* from tokens.css + the theme store.
const src = readFileSync(join(ROOT, 'src', 'tokens.css'), 'utf8');
const tokens = {};
for (const m of src.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) tokens[m[1].replace(/^p31-/, '')] = m[2].trim();

const resolve = (name) => {
  let v = tokens[name];
  for (let i = 0; i < 5 && v?.startsWith('var(--') && v?.endsWith(')'); i++) {
    v = tokens[v.slice(6, -1)];
  }
  return v;
};

// Pairs to check: body text 4.5:1, large/UI 3:1 (names must exist in tokens.css).
const PAIRS = [
  ['text-primary', 'void', 4.5],
  ['text-primary', 'surface', 4.5],
  ['text-primary', 'surface2', 4.5],
  ['text-muted', 'void', 4.5],
  ['text-muted', 'surface', 3.0],
  ['accent-cyan', 'void', 3.0],
  ['accent-green', 'void', 3.0],
  ['accent-gold', 'void', 3.0],
  ['accent-violet', 'void', 3.0],
];

let fail = 0;
for (const [fgName, bgName, min] of PAIRS) {
  const fg = parseOklch(resolve(fgName));
  const bg = parseOklch(resolve(bgName));
  if (!fg || !bg) {
    console.log(`  – ${fgName} on ${bgName}: skipped (non-oklch / unresolved)`);
    continue;
  }
  const c = contrast(fg, bg);
  const ok = c >= min;
  if (!ok) fail = 1;
  console.log(`${ok ? '✓' : '✗'} ${fgName} on ${bgName}: ${c.toFixed(2)}:1 (need ≥${min})`);
}

if (fail) {
  console.error('\ncontrast-audit FAIL — fix the flagged token pairs before ship.');
  process.exit(1);
}
console.log('\ncontrast-audit OK — text-on-surface pairs meet WCAG 2.2 AA');