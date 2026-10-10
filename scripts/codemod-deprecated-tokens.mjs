#!/usr/bin/env node
/**
 * codemod-deprecated-tokens.mjs — rewrite deprecated token usages.
 *
 * Reads packages/canon/deprecations.json (flat --p31-* → { $deprecated,
 * $replacement }). For each deprecated token:
 *   - $replacement set → rewrite var(--old) → var(--new) in consumer files.
 *   - $replacement null → report (no successor; the token is dead, not renamed).
 *
 * Default is --dry-run. Pass --write to apply.
 *
 * Usage: node scripts/codemod-deprecated-tokens.mjs [--write] [path...]
 */
import { readFileSync, readdirSync, writeFileSync, existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MANIFEST = join(ROOT, 'packages', 'canon', 'deprecations.json');
const write = process.argv.includes('--write');

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const replacements = new Map();
for (const [old, meta] of Object.entries(manifest)) {
  replacements.set(old, meta.$replacement ?? null);
}

// Consumer scan roots: the design-system's own consuming CSS + source.
const SCAN_DIRS = [
  'packages/design-core/src/css',
  'packages/design-core/src',
  'packages/ui-forge/src',
  'portals/shell/src',
];
const EXTS = /\.(css|ts|tsx|js|mjs)$/;

let rewritten = 0;
let reported = 0;
const changes = [];

function scan(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const st = lstatSync(p);
    if (st.isDirectory()) {
      if (/node_modules|dist|\.git/.test(entry)) continue;
      scan(p);
    } else if (EXTS.test(p)) {
      let src = readFileSync(p, 'utf8');
      for (const [old, repl] of replacements) {
        const re = new RegExp(`var\\(${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`, 'g');
        if (!re.test(src)) continue;
        re.lastIndex = 0;
        if (repl) {
          const before = src;
          src = src.replace(re, `var(${repl})`);
          if (src !== before) {
            rewritten++;
            changes.push(`${p}: ${old} → ${repl}`);
          }
        } else {
          reported++;
          changes.push(`${p}: ${old} (no replacement — dead token)`);
        }
      }
      if (write && src !== readFileSync(p, 'utf8')) writeFileSync(p, src);
    }
  }
}

for (const d of SCAN_DIRS) if (existsSync(join(ROOT, d))) scan(join(ROOT, d));

console.log(`codemod: ${rewritten} rewrites, ${reported} dead-token reports${write ? ' (applied)' : ' (dry-run)'}`);
changes.slice(0, 20).forEach((c) => console.log('  ' + c));