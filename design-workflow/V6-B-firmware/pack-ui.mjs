#!/usr/bin/env node
// pack-ui.mjs — P31 Lane B (v6.0) single-header web-asset packer. ZERO-DEP.
//
// Reads  D-embedded/ui/{index.html,styles.css}
// Emits  firmware/node-zero/main/p31_web_assets.h
//   - gzip-compressed byte arrays (served with Content-Encoding: gzip)
//   - original (raw) byte arrays (fallback when client lacks gzip)
//   - original-size + gz-size fields
//   - sha256-of-gz ETag constant per asset (svelteesp32 pattern, minimal)
//
// Gate: prints gz budget; web assets must be <= 100 KB gz combined.

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANE = __dirname;                                    // .../V6-B-firmware
const UI_DIR = join(LANE, '..', 'D-embedded', 'ui');
const OUT = join(LANE, '..', '..', '..', 'P31-local-workspace',
                 'firmware', 'node-zero', 'main', 'p31_web_assets.h');

const ASSETS = [
  { name: 'INDEX', file: 'index.html',  ctype: 'text/html; charset=utf-8' },
  { name: 'CSS',   file: 'styles.css',  ctype: 'text/css; charset=utf-8'  },
];

const BUDGET_GZ = 100 * 1024;   // 100 KB gz cap (runbook v6.0 §5 B-3)

function cArray(name, bytes) {
  const lines = [];
  for (let i = 0; i < bytes.length; i += 12) {
    lines.push('    ' + Array.from(bytes.slice(i, i + 12))
      .map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ') + ',');
  }
  if (!lines.length) lines.push('    ');
  return `static const uint8_t ${name}[${bytes.length}] = {\n${lines.join('\n')}\n};\n`;
}

function build() {
  let totalGz = 0;
  const decls = [];
  const defs = [];

  for (const a of ASSETS) {
    const raw = readFileSync(join(UI_DIR, a.file));
    const gz = gzipSync(raw, { level: 9 });
    const etag = createHash('sha256').update(gz).digest('hex');
    totalGz += gz.length;

    defs.push(`// ${a.file} — ${raw.length} B raw, ${gz.length} B gz (sha256:${etag})`);
    defs.push(`#define P31_WEB_${a.name}_RAW_LEN  ${raw.length}`);
    defs.push(`#define P31_WEB_${a.name}_GZ_LEN   ${gz.length}`);
    defs.push(`#define P31_WEB_${a.name}_ETAG     "${etag}"`);
    defs.push(`#define P31_WEB_${a.name}_CTYPE    "${a.ctype}"`);
    defs.push(cArray(`P31_WEB_${a.name}_GZ`, gz));
    defs.push(cArray(`P31_WEB_${a.name}_RAW`, raw));
  }

  const hdr = `/* ────────────────────────────────────────────────────────────
 * p31_web_assets.h — GENERATED — DO NOT EDIT
 * Regenerate:  node V6-B-firmware/pack-ui.mjs
 * Source:      production/design-workflow/D-embedded/ui (index.html, styles.css)
 * ──────────────────────────────────────────────────────────── */

#ifndef P31_WEB_ASSETS_H
#define P31_WEB_ASSETS_H

#include <stdint.h>

${defs.join('\n')}

#endif /* P31_WEB_ASSETS_H */
`;

  writeFileSync(OUT, hdr);
  const outSize = statSync(OUT).size;
  return { totalGz, outSize, sizes: ASSETS.map(a => a.file) };
}

const r = build();
for (const a of ASSETS) {
  const raw = statSync(join(UI_DIR, a.file)).size;
  const gz = gzipSync(readFileSync(join(UI_DIR, a.file)), { level: 9 }).length;
  console.log(`  ${a.file}: ${raw} B raw -> ${gz} B gz`);
}
console.log(`  TOTAL gz: ${r.totalGz} B  (budget ${BUDGET_GZ} B)`);
console.log(`  header:   ${r.outSize} B -> ${OUT}`);
if (r.totalGz > BUDGET_GZ) {
  console.error('BUDGET EXCEEDED');
  process.exit(1);
}
console.log('PACK OK');