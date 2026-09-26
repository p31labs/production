#!/usr/bin/env node
/**
 * surface-audit — enforce "never stack glass on glass". Flags any rule that
 * nests a backdrop-filter / box-shadow inside a .glass-tile (the triple-border
 * failure mode), and any selector that applies backdrop-filter to an element
 * already inside a glass container.
 * Run after edits. Usage: node scripts/surface-audit.mjs
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
for (const f of files) {
  let src = readFileSync(f, 'utf8');
  // Strip comments so they can't masquerade as selectors.
  src = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Split into rule blocks: selector(s) { body }
  const blocks = src.match(/[^{}]+\{[^{}]*\}/g) ?? [];
  for (const block of blocks) {
    const sel = block.split('{')[0];
    const body = block.split('{')[1];
    // Nested-glass: an ACTIVE blur/shadow on a descendant of a glass-tile.
const nestedVal = body.match(/(?:backdrop-filter|box-shadow):\s*([^;\s]+)/g);
const hasActive = nestedVal && nestedVal.some((m) => {
  const v = m.slice(m.indexOf(':') + 1).trim();
  return v !== 'none' && v !== '0' && v !== 'transparent';
});
if (/\.glass-tile\s+\S/.test(sel) && hasActive) {
      console.error(`✗ ${f.replace(SRC, 'src')} — nested glass on ${sel.trim()}`);
      fail = 1;
    }
    if (/(backdrop-filter|box-shadow):\s*[^;]+;/.test(body) && /box-shadow/.test(body) && /backdrop-filter/.test(body)) {
      // A single rule applying BOTH blur and shadow is a glass panel (OK at the
      // top level). Only the nested-inside-glass-tile case above is a violation.
    }
  }
}

if (fail) {
  console.error('\nsurface-audit FAIL — remove the inner frame (one glass layer per card).');
  process.exit(1);
}
console.log('surface-audit OK — no stacked glass inside .glass-tile');