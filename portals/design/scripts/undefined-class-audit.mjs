#!/usr/bin/env node
/**
 * undefined-class-audit — catch the "content riding the edge" class of bug
 * forever. Scans every className literal in the portal's TSX/TS and reports
 * any class token that is NOT defined in the built CSS (the artifact — this is
 * a build-output property, invisible to linters because each source file is
 * individually correct). Would have caught the undefined p-6/p-8 utilities.
 *
 * Runs AFTER `vite build` so dist/assets/*.css exists. Dynamic/state tokens are
 * allowed: `is-*`, `has-*`, `data-*`, emoji, and `--`-suffixed modifier bases
 * (e.g. `icon-grid--${variant}` → base `icon-grid`). Usage: node scripts/undefined-class-audit.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const SRC = join(ROOT, '..', 'src');
const DIST = join(ROOT, '..', 'dist', 'assets');

// 1) collect every class token used in source.
const used = new Set();
function walk(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(f.name)) {
      const s = readFileSync(p, 'utf8');
      for (const m of s.matchAll(/className\s*=\s*["`]([^"`$]*)["`]/g)) {
        for (const t of m[1].split(/\s+/)) if (t) used.add(t);
      }
      // ternary/expression classNames: extract quoted literals inside {}.
      for (const m of s.matchAll(/className\s*=\s*\{([^}]*)\}/g)) {
        for (const q of m[1].matchAll(/['"]([^'"]+)['"]/g)) {
          for (const t of q[1].split(/\s+/)) if (t) used.add(t);
        }
      }
    }
  }
}
walk(SRC);

// 2) collect every class token defined in the built CSS (unescape \: \[ \]).
const defined = new Set();
for (const f of readdirSync(DIST)) {
  if (!/\.css$/.test(f)) continue;
  const s = readFileSync(join(DIST, f), 'utf8');
  for (const m of s.matchAll(/\.((?:[A-Za-z_]|\\[:\[\]])[\w-]*(?:\\[:\[\]][\w-]*)*)/g)) {
    defined.add(m[1].replace(/\\([:\[\]])/g, '$1'));
  }
}

// 3) allowlist helpers.
const isState = (t) => /^(is-|has-|data-|js-|--)/.test(t) || /--$/.test(t);
const isEmoji = (t) => /[^\x00-\x7F]/.test(t);
// BEM modifier: a2ui-pane--intent is fine if the base (.a2ui-pane) is defined.
const bemOk = (t) => t.includes('--') && defined.has(t.split('--')[0]);
// Marker/aria tokens that intentionally carry no styling.
const MARKERS = new Set(['pass', 'reject', 'portal-shell']);

const missing = [...used]
  .filter((t) => !defined.has(t) && !isState(t) && !isEmoji(t) && !bemOk(t) && !MARKERS.has(t))
  .sort();

if (missing.length) {
  console.error(`✗ undefined-class — ${missing.length} class(es) used but never defined in the built CSS:`);
  for (const t of missing) console.error(`  ${t}`);
  console.error('\nundefined-class-audit FAIL — every className must be defined (or a dynamic/state/emoji token).');
  process.exit(1);
}
console.log(`undefined-class-audit OK — ${used.size} classes used, all defined in the build`);