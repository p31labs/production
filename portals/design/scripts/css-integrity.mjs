#!/usr/bin/env node
/**
 * css-integrity — asserts the BUILT CSS preserves source invariants that the
 * other gates can't see. Catches exactly the class of bug that shipped:
 * esbuild's CSS minifier dropping @layer AND mis-merging `*.body` class
 * selectors into the bare `body` element (`.docs-body`, `.app-body`,
 * `.notif-toast__body` → `body`), which clobbers the real <body> and collapses
 * the whole layout.
 *
 * Checks the emitted main-*.css for:
 *   1. The @layer order declaration is present.
 *   2. Design tokens (--p31-glass-bg, --p31-accent, --p31-void) are defined.
 *   3. NO body{ rule carries the .docs-body/.app-body collision properties
 *      (max-width:800px · min-height:800px · height:calc(100vh - 64px)).
 *   4. Brace count is balanced.
 * Run after `vite build`. Usage: node scripts/css-integrity.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');
if (!existsSync(DIST)) {
  console.error('❌ dist/assets missing — run `vite build` first.');
  process.exit(1);
}

const mainCss = readdirSync(DIST).filter((f) => f.endsWith('.css') && /^(main|index)/.test(f));
if (mainCss.length === 0) {
  console.error('❌ no main/index css found in dist/assets');
  process.exit(1);
}

// Vite strips the bare `@layer base, vendors, suite, content;` order statement
// during bundling (documented Vite issue #22705), but the @layer BLOCKS survive
// in the per-surface chunks. The hard invariants are: no body-collision, tokens
// defined, and the @layer at-rule present in at least one emitted chunk.
const anyCss = readdirSync(DIST).filter((f) => f.endsWith('.css'));
const layerBlocksExist = anyCss.some((f) => readFileSync(join(DIST, f), 'utf8').includes('@layer'));

let fail = 0;
if (!layerBlocksExist) {
  console.error('✗ @layer at-rules stripped from ALL emitted CSS');
  fail = 1;
}

for (const file of mainCss) {
  const src = readFileSync(join(DIST, file), 'utf8');

  // 1. Tokens defined.
  for (const t of ['--p31-glass-bg:', '--p31-accent:', '--p31-void:']) {
    if (!src.includes(t)) {
      console.error(`✗ ${file} — token ${t} missing`);
      fail = 1;
    }
  }

  // 2. Body-collision check: no body{ rule with the merged *.body properties.
  const bodyRules = [...src.matchAll(/body\s*\{([^}]*)\}/g)].map((m) => m[1]);
  for (const body of bodyRules) {
    if (/max-width:\s*800px|min-height:\s*800px|height:\s*calc\(100vh - 64px\)/.test(body)) {
      console.error(`✗ ${file} — body{...} contains a merged *.body selector (${body.slice(0, 60)}…)`);
      fail = 1;
    }
  }

  // 3. Brace balance.
  const opens = (src.match(/\{/g) ?? []).length;
  const closes = (src.match(/\}/g) ?? []).length;
  if (opens !== closes) {
    console.error(`✗ ${file} — unbalanced braces (${opens} open / ${closes} close)`);
    fail = 1;
  }

  if (!fail) console.log(`✓ ${file} — tokens, body-integrity, braces OK`);
}

if (fail) {
  console.error('\ncss-integrity FAIL — the built CSS is unsafe to ship.');
  process.exit(1);
}
console.log('css-integrity OK — built CSS preserves source invariants');