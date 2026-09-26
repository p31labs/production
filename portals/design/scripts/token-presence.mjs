#!/usr/bin/env node
/**
 * token-presence — post-build gate: assert the design-core token DEFINITIONS
 * landed in the built CSS. Catches exactly the bug where `@import` of the
 * design-core aggregate is silently dropped by the bundler (typecheck/lint/
 * test never touch CSS, and token-audit only blocks raw hex).
 *
 * Run AFTER `vite build`. Usage: node scripts/token-presence.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'assets');

const REQUIRED = ['--p31-glass-bg', '--p31-void', '--p31-accent-cyan', '--p31-text-primary'];

if (!existsSync(DIST)) {
  console.error('❌ dist/assets missing — run `vite build` before token-presence.');
  process.exit(1);
}

const cssFiles = readdirSync(DIST).filter((f) => f.endsWith('.css'));
let fail = 0;

for (const token of REQUIRED) {
  const definedIn = cssFiles.filter((f) => readFileSync(join(DIST, f), 'utf8').includes(`${token}:`));
  if (definedIn.length === 0) {
    console.error(`✗ token ${token} — NOT defined in any built CSS (import dropped?)`);
    fail = 1;
  } else {
    console.log(`✓ ${token} defined in ${definedIn.map((f) => f.replace('.css', '')).join(', ')}`);
  }
}

if (fail) {
  console.error('\ntoken-presence FAIL — the design-core aggregate did not reach the bundle.');
  process.exit(1);
}
console.log('\ntoken-presence OK — all required design tokens defined in the built CSS');