#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// V3-C-canon/canon-diff/gen-patches.mjs — Lane C v3.0, C-3.
// Generates the exact RFC-6902 JSON patches for the two canon-drift findings
// (F1, F2) plus the NEGATIVE-CONTROL hex patch. Reads the canon READ-ONLY.
//
// F1: remove /themes/sunlight/p31/text (child-introduced structure; value is
//     duplicated by sunlight.p31.text-primary — zero information loss).
// F2: complete every per-token $extensions.p31.themes map to 11 packs by
//     deriving the missing entries (ocean on all 24 maps; aurora also on
//     accent.green.muted) under the verified uniform rules:
//       exact       → top-level pack token $value (colorSpace + components)
//       alpha:0.8   → pack token components + alpha 0.8 (action.primary-hover)
//       chroma:0.05 → pack token L,H with chroma pinned to 0.05 (*-muted)
// NEG: add a raw-hex token (#000000) — MUST make token-audit fail.
//
// Usage: node gen-patches.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const CANON = '/home/p31/production/packages/canon/tokens/tokens.dtc.json';
const HERE = dirname(fileURLToPath(import.meta.url));
const j = JSON.parse(readFileSync(CANON, 'utf8'));

const esc = (s) => s.replace(/~/g, '~0').replace(/\//g, '~1');
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── Locate every per-token $extensions.p31.themes map ───────────────────────
const maps = [];
(function walk(o, path) {
  if (Array.isArray(o)) { for (const x of o) walk(x, path); return; }
  if (o && typeof o === 'object') {
    const ext = o.$extensions?.p31?.themes;
    if (ext && typeof ext === 'object' && Object.keys(ext).length > 0) {
      maps.push({ path: path + '/$extensions/p31/themes', packs: Object.keys(ext), ext });
    }
    for (const [k, v] of Object.entries(o)) walk(v, path + '/' + esc(k));
  }
})(j, '');

// ── Derivation rules (verified uniform across all present packs, 2026-10-11) ─
const rule = {
  '/p31/color/action/primary': ['accent', 'exact'],
  '/p31/color/action/primary-hover': ['accent', 'alpha:0.8'],
  '/p31/color/action/primary-text': ['text-primary', 'exact'],
  '/p31/color/action/secondary': ['surface2', 'exact'],
  '/p31/color/action/secondary-text': ['text-primary', 'exact'],
  '/p31/color/action/ghost-hover': ['glass-bg', 'exact'],
  '/p31/color/text/primary': ['text-primary', 'exact'],
  '/p31/color/text/secondary': ['text-secondary', 'exact'],
  '/p31/color/text/muted': ['text-tertiary', 'exact'],
  '/p31/color/accent/default': ['accent', 'exact'],
  '/p31/color/accent/violet/default': ['accent-violet', 'exact'],
  '/p31/color/accent/violet/muted': ['accent-violet', 'chroma:0.05'],
  '/p31/color/accent/gold/default': ['accent-gold', 'exact'],
  '/p31/color/accent/gold/muted': ['accent-gold', 'chroma:0.05'],
  '/p31/color/accent/green/default': ['accent-green', 'exact'],
  '/p31/color/accent/green/muted': ['accent-green', 'chroma:0.05'],
  '/p31/color/accent/red/default': ['accent-red', 'exact'],
  '/p31/color/accent/red/muted': ['accent-red', 'chroma:0.05'],
  '/p31/color/accent/muted': ['accent', 'chroma:0.05'],
  '/p31/glass/background': ['glass-bg', 'exact'],
  '/p31/glass/border': ['glass-border', 'exact'],
  '/p31/surface/background': ['bg', 'exact'],
  '/p31/surface/raised': ['surface', 'exact'],
  '/p31/surface/overlay': ['surface2', 'exact'],
};

/** Derive the entry for a pack from its top-level theme token. */
function derive(pack, flat, mode) {
  const src = j.themes[pack].p31[flat]?.$value;
  if (!src || !src.colorSpace || !Array.isArray(src.components) || src.components.length !== 3) {
    throw new Error(`cannot derive ${pack}.p31.${flat}: missing/shape-mismatch value ${JSON.stringify(src)}`);
  }
  if (mode === 'exact') {
    const out = { colorSpace: src.colorSpace, components: [...src.components] };
    if (src.alpha !== undefined) out.alpha = src.alpha; // glass-bg/glass-border carry alpha in every pack — mirrored as-is
    return out;
  }
  if (mode === 'alpha:0.8') {
    const out = { colorSpace: src.colorSpace, components: [...src.components], alpha: 0.8 };
    return out;
  }
  if (mode === 'chroma:0.05') {
    const out = { colorSpace: src.colorSpace, components: [src.components[0], 0.05, src.components[2]] };
    if (src.alpha !== undefined) out.alpha = src.alpha;
    return out;
  }
  throw new Error(`unknown derivation rule '${mode}'`);
}

// ── F2 ops: complete every map to 11 packs ──────────────────────────────────
const f2Ops = [];
let added = 0;
for (const m of maps) {
  const tokenPath = m.path.slice(0, m.path.indexOf('/$extensions'));
  const [flat, mode] = rule[tokenPath];
  if (!flat) throw new Error(`no derivation rule for ${tokenPath}`);
  // Every map lacks ocean; accent.green.muted additionally lacks aurora.
  const missing = ['ocean', ...(tokenPath.endsWith('/green/muted') ? ['aurora'] : [])]
    .filter((pack) => !m.packs.includes(pack));
  for (const pack of missing) {
    f2Ops.push({ op: 'add', path: `${m.path}/${pack}`, value: derive(pack, flat, mode) });
    added++;
  }
}
console.log(`F2: ${maps.length} extension maps, ${added} missing pack entries derived and queued.`);
for (const op of f2Ops) console.log(`  add ${op.path} → ${JSON.stringify(op.value)}`);

// ── F1 ops: remove sunlight's child-introduced text ─────────────────────────
const sunTextPath = '/themes/sunlight/p31/text';
const sunText = j.themes.sunlight.p31.text;
const f1Ops = [
  { op: 'test', path: sunTextPath, value: sunText },
  { op: 'remove', path: sunTextPath },
];

// ── NEG ops: introduce raw hex (negative control — audit MUST fail) ─────────
const negOps = [
  {
    op: 'add',
    path: '/p31/color/hex-drift',
    value: { $value: '#000000', $type: 'color' },
  },
];

const header = {
  'target-commit': 'packages/canon/tokens/tokens.dtc.json (2026-10-11, 152516 bytes)',
  'applies-to': 'tokens/tokens.dtc.json and mirror tokens/tokens.json',
  'method': 'RFC 6902 (test/add/remove)',
  'generated-by': 'V3-C-canon/canon-diff/gen-patches.mjs (canon READ-ONLY)',
};

writeFileSync(join(HERE, 'C3-F1-sunlight-text.patch.json'),
  JSON.stringify({
    'patch-id': 'p31_v3c_c3_f1_sunlight_text',
    ...header,
    description: 'F1: remove child-introduced structure sunlight.p31.text (tokens.dtc.json:6517). Value oklch(0.22 0.015 80) is duplicated by sunlight.p31.text-primary — zero information loss. test op asserts the exact pre-state.',
    operations: f1Ops,
  }, null, 2) + '\n');

writeFileSync(join(HERE, 'C3-F2-extensions-themes-equals-11.patch.json'),
  JSON.stringify({
    'patch-id': 'p31_v3c_c3_f2_extensions_themes_11',
    ...header,
    description: 'F2: complete the per-token $extensions.p31.themes mirror to 11 packs. Ocean derived exactly from themes.ocean.p31 under the verified uniform rules (exact / alpha:0.8 on action.primary-hover / chroma:0.05 on *-muted); accent.green.muted additionally gains aurora (derived from themes.aurora.p31.accent-green, chroma:0.05).',
    operations: f2Ops,
  }, null, 2) + '\n');

writeFileSync(join(HERE, 'C3-NEG-raw-hex.patch.json'),
  JSON.stringify({
    'patch-id': 'p31_v3c_c3_neg_raw_hex',
    ...header,
    description: 'NEGATIVE CONTROL: introduces a raw hex color literal (#000000) into the token source. token-audit.mjs MUST fail on the patched copy. Not a real proposal — a gate-control artifact.',
    operations: negOps,
  }, null, 2) + '\n');

console.log('Wrote C3-F1-sunlight-text.patch.json, C3-F2-extensions-themes-equals-11.patch.json, C3-NEG-raw-hex.patch.json');