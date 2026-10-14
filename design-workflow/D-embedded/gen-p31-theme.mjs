#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// D/gen-p31-theme.mjs — Lane D: canon tokens → LVGL 8.4 p31_theme.h
// Node 24 ESM, zero dependencies. Reads:
//   • /home/p31/production/packages/canon/tokens/tokens.dtc.json  (canon, READ-ONLY)
//   • D/color-map.json                                             (auditable 1:1 map)
// Writes: D/dist/p31_theme.h  (GENERATED — never hand-edited)
//
// FAIL CLOSED (exit 1): missing token path · deprecated token · wrong $type.
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dtcgColorToSrgb8, compositeOver, hexToSrgb8, srgb8ToHex } from './oklch-to-srgb.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';
const MAP_PATH = path.join(HERE, 'color-map.json');
const OUT_DIR = path.join(HERE, 'dist');
const OUT_PATH = path.join(OUT_DIR, 'p31_theme.h');

const tokens = JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8'));
const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));

/** Resolve a dotted token path ("themes.cipher.p31.bg") against the JSON root. */
function resolveToken(root, tokenPath) {
  let node = root;
  for (const seg of tokenPath.split('.')) {
    if (node == null || typeof node !== 'object' || !(seg in node)) return null;
    node = node[seg];
  }
  return node;
}

/** Resolve with fail-closed error message. */
function requireToken(tokenPath) {
  const node = resolveToken(tokens, tokenPath);
  if (!node) {
    console.error(`FAIL: canon token not found: ${tokenPath}`);
    process.exit(1);
  }
  if (node.$deprecated) {
    console.error(`FAIL: canon token is deprecated: ${tokenPath} (${node.$deprecated}) — map to a live token, never a deprecated one`);
    process.exit(1);
  }
  return node;
}

// ── Resolve colors ────────────────────────────────────────────────────────────
const resolved = []; // { define, token, oklch, hex, rgb565, rgb8, composite? }
for (const entry of map.colors) {
  const node = requireToken(entry.token);
  if (node.$type !== 'color') {
    console.error(`FAIL: ${entry.token} has $type "${node.$type}", expected "color"`);
    process.exit(1);
  }
  let conv = dtcgColorToSrgb8(node.$value);
  let rgb8 = conv.rgb8;
  let over = null;
  if (entry.compositeOver) {
    const backdrop = resolved.find((r) => r.define === entry.compositeOver);
    if (!backdrop) {
      console.error(`FAIL: ${entry.define} compositeOver=${entry.compositeOver} but that define is not declared earlier in the map`);
      process.exit(1);
    }
    over = entry.compositeOver;
    rgb8 = compositeOver(rgb8, conv.alpha, backdrop.rgb8);
  }
  resolved.push({
    define: entry.define,
    token: entry.token,
    oklch: `oklch(${node.$value.components.join(' ')}${conv.alpha !== undefined ? ` / ${conv.alpha}` : ''})`,
    hex: srgb8ToHex(rgb8),
    rgb565: ((rgb8[0] >> 3) << 11) | ((rgb8[1] >> 2) << 5) | (rgb8[2] >> 3),
    rgb8,
    compositeOver: over,
    note: entry.note || null,
  });
}

// ── Resolve spacing / radius (dimension px, fixed dp on the 3.5" panel) ──────
function resolveDims(entries) {
  const out = [];
  for (const entry of entries) {
    const node = requireToken(entry.token);
    if (node.$type !== 'dimension' || !node.$value || node.$value.unit !== 'px') {
      console.error(`FAIL: ${entry.token} must be a dimension in px (got ${JSON.stringify(node.$value)})`);
      process.exit(1);
    }
    out.push({ define: entry.define, token: entry.token, px: node.$value.value });
  }
  return out;
}
const spacing = resolveDims(map.spacing);
const radius = resolveDims(map.radius);

// ── Emit header ───────────────────────────────────────────────────────────────
const L = [];
const push = (s) => L.push(s);

push('/* ────────────────────────────────────────────────────────────');
push(' * p31_theme.h — GENERATED — DO NOT EDIT');
push(' * Regenerate:  node D/gen-p31-theme.mjs');
push(' * Canon:       production/packages/canon/tokens/tokens.dtc.json');
push(' * Map:         D/color-map.json  (theme: themes.cipher)');
push(' * Each #define carries its canon token path in a trailing comment.');
push(' *');
push(' * DERIVATION (canon token names; resolved values in per-define comments):');
for (let i = 0; i < resolved.length; i += 2) {
  const a = `${resolved[i].define} ← ${resolved[i].token}`;
  const b = resolved[i + 1] ? `${resolved[i + 1].define} ← ${resolved[i + 1].token}` : '';
  push(` *   ${a.padEnd(60)}${b}`);
}
push(' *');
push(' * FIXED dp: 320×480 single-viewport panel (AXS15231B, sw_rotate 90°) —');
push(' * canon clamp() fluid spacing collapses to its fixed value (1px = 1dp).');
push(' *');
push(' * FIDELITY BAR: OKLCH→sRGB (CSS Color 4) → 8-bit round → RGB565 quantize.');
push(' * Spoon arc + status colors are what matter on the 3.5" panel; a color');
push(' * that reads wrong through RGB565 is fixed IN THE TOKEN, never in');
push(' * p31_ui.c (runbook §8 D-2).');
push(' * ──────────────────────────────────────────────────────────── */');
push('');
push('#ifndef P31_THEME_H');
push('#define P31_THEME_H');
push('');
push('#include "lvgl.h"');
push('');
push('#ifdef __cplusplus');
push('extern "C" {');
push('#endif');
push('');
push('/* ── Semantic colors (LVGL 8.4: lv_color_make(r,g,b), 8-bit) ─────────── */');
for (const c of resolved) {
  const [r, g, b] = c.rgb8;
  push(`#define ${c.define.padEnd(26)} lv_color_make(0x${r.toString(16).toUpperCase().padStart(2, '0')}, 0x${g.toString(16).toUpperCase().padStart(2, '0')}, 0x${b.toString(16).toUpperCase().padStart(2, '0')})  /* ${c.hex} ← ${c.token}${c.compositeOver ? ` over ${c.compositeOver}` : ''} */`);
}
push('');
push('/* ── Spacing (fixed dp, 3.5" panel — rationale above) ─────────────────── */');
for (const s of spacing) push(`#define ${s.define.padEnd(26)} ${s.px}  /* ${s.token} */`);
push('');
push('/* ── Corner radius ──────────────────────────────────────────────────────── */');
for (const r of radius) push(`#define ${r.define.padEnd(26)} ${r.px}  /* ${r.token} */`);
push('');
push('/* ── Fonts (closest to canon p31.font-display; enabled in main/lv_conf.h:');
push(' *    LV_FONT_MONTSERRAT_14/16/24 = 1) ──────────────────────────────────── */');
for (const f of map.fonts) push(`#define ${f.define.padEnd(26)} ${f.lvgl}`);
push('');
push('/* ── Theme container ────────────────────────────────────────────────────── */');
push('/* screen / card / button = the three LVGL 8.4 style classes. "card" = any');
push(' * lv_obj_create surface (header, track backgrounds); "button" = lv_btn_create.');
push(' * Labels take P31_COLOR_TEXT_* directly (title, spoon %, RSSI, status). */');
push('typedef struct {');
push('    lv_style_t screen;   /* page background  */');
push('    lv_style_t card;     /* raised surfaces  */');
push('    lv_style_t button;   /* primary action   */');
push('} p31_theme_t;');
push('');
push('/* Initialize all theme styles. Call once before building widgets. */');
push('void p31_theme_init(p31_theme_t *theme) {');
push('    lv_style_init(&theme->screen);');
push('    lv_style_set_bg_color(&theme->screen, P31_COLOR_BG);');
push('    lv_style_set_bg_opa(&theme->screen, LV_OPA_COVER);');
push('    lv_style_set_pad_all(&theme->screen, 0);');
push('');
push('    lv_style_init(&theme->card);');
push('    lv_style_set_bg_color(&theme->card, P31_COLOR_SURFACE);');
push('    lv_style_set_bg_opa(&theme->card, LV_OPA_COVER);');
push('    lv_style_set_radius(&theme->card, P31_RADIUS_MD);');
push('    lv_style_set_pad_all(&theme->card, P31_SPACE_MD);');
push('    lv_style_set_border_width(&theme->card, 0);');
push('');
push('    lv_style_init(&theme->button);');
push('    lv_style_set_bg_color(&theme->button, P31_COLOR_ACCENT);');
push('    lv_style_set_bg_opa(&theme->button, LV_OPA_COVER);');
push('    lv_style_set_text_color(&theme->button, P31_COLOR_TEXT_PRIMARY); /* on-accent = canon text-primary (light on dark) */');
push('    lv_style_set_text_font(&theme->button, P31_FONT_LABEL);');
push('    lv_style_set_radius(&theme->button, P31_RADIUS_SM);');
push('    lv_style_set_pad_all(&theme->button, P31_SPACE_SM);');
push('    lv_style_set_border_width(&theme->button, 0);');
push('}');
push('');
push('/* ── Apply helpers ──────────────────────────────────────────────────────── */');
push('static inline void p31_theme_apply_screen(lv_obj_t *obj, p31_theme_t *t) { lv_obj_add_style(obj, &t->screen, 0); }');
push('static inline void p31_theme_apply_card(lv_obj_t *obj, p31_theme_t *t)   { lv_obj_add_style(obj, &t->card, 0); }');
push('static inline void p31_theme_apply_button(lv_obj_t *obj, p31_theme_t *t) { lv_obj_add_style(obj, &t->button, 0); }');
push('');
push('#ifdef __cplusplus');
push('} /* extern "C" */');
push('#endif');
push('');
push('#endif /* P31_THEME_H */');
push('');

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_PATH, L.join('\n'));
const bytes = Buffer.byteLength(L.join('\n'));
console.log(`wrote ${OUT_PATH} (${bytes} bytes, ${resolved.length} colors + ${spacing.length} spacing + ${radius.length} radius + ${map.fonts.length} fonts)`);
console.log(`budget: header ≤ 8192 bytes → ${bytes <= 8192 ? 'PASS' : 'FAIL'} (${bytes} bytes)`);
if (bytes > 8192) process.exit(1);