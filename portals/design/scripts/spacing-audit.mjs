#!/usr/bin/env node
/**
 * spacing-audit — enforce the 4px/8px spacing scale across all portal CSS.
 * Flags any hardcoded px margin/padding that is NOT a multiple of 4 (excluding
 * 0 and hairline 1px/2px borders). The enterprise layout rhythm (M3/Coinbase:
 * 4dp base, 8dp increments) means 13px/27px/5px are forbidden.
 * Run after edits. Usage: node scripts/spacing-audit.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = [];
const walk = (d) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (e.name.startsWith('.') || e.name === '__tests__') continue;
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.css')) files.push(p);
  }
};
walk(SRC);

let fail = 0;
const rx = /(margin|padding)[^:;]*:\s*([^;]+);/g;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(rx)) {
    const values = m[2].split(/\s+/);
    for (const v of values) {
      const px = v.match(/^(-?\d+(?:\.\d+)?)px$/);
      if (!px) continue;
      const n = Math.abs(parseFloat(px[1]));
      if (n === 0 || n === 1 || n === 2) continue; // 0 + hairlines allowed
      if (n % 4 !== 0) {
        console.error(`✗ ${f.replace(SRC, 'src')} — ${m[1].trim()}: ${v} (not on 4px scale)`);
        fail = 1;
      }
    }
  }
}

if (fail) {
  console.error('\nspacing-audit FAIL — use the 4px/8px scale (or a --p31-space token).');
  process.exit(1);
}
console.log('spacing-audit OK — all px margins/padding on the 4px scale');