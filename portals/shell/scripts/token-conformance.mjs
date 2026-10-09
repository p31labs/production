#!/usr/bin/env node
/**
 * token-conformance.mjs — fails the build on any ported-design-system class,
 * hardcoded color, or Tailwind visual utility in the shell source.
 *
 * The research is explicit: "A component that styles itself with config-token
 * classes will render completely unstyled — TypeScript cannot catch this.
 * Only a text search for token-named classes can." This scanner is that text
 * search, promoted to a release blocker.
 *
 * Usage: node scripts/token-conformance.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

// QPJ / foreign design-system classes — the token-named vocabulary that has
// no stylesheet in the shell and renders unstyled silently.
const FORBIDDEN_PATTERNS = [
  /\btext-cloud\b/,
  /\bbg-black\b/,
  /\bborder-white\b/,
  /\btext-quantum\b/,
  /\bbg-quantum\b/,
  /\bfont-mono-tech\b/,
  /\bglass-panel\b/, // reserved: canon class, must come from @p31ca CSS
  /\bring-quantum\b/,
  /\btext-ink\b/,
  // Tailwind visual utilities (layout utilities are permitted)
  /\btext-(xs|sm|base|lg|xl|2xl|3xl)\b/,
  /\bbg-(white|black|gray-\d+)\b/,
  /\bborder-(white|black|gray-\d+)\b/,
  /\bfont-(bold|semibold|medium)\b/,
  // Hardcoded colors — everything resolves through var(--p31-*)
  /#[0-9a-fA-F]{3,8}\b/,
  /\brgb\(/,
  /\boklch\(/,
];

// Files that are exempt (the shell's own layout CSS, tests, generated schema).
const ALLOW = [
  'src/index.css', // geometry classes live here
  'src/forge-schema.json',
];

function isAllowed(file) {
  for (const a of ALLOW) {
    if (typeof a === 'string' && file.endsWith(a)) return true;
    if (a instanceof RegExp && a.test(file)) return true;
  }
  return false;
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|css)$/.test(p)) out.push(p);
  }
  return out;
}

let violations = 0;
for (const file of walk(SRC)) {
  if (isAllowed(file)) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const re of FORBIDDEN_PATTERNS) {
      if (re.test(line)) {
        console.error(`${file}:${i + 1}: forbidden pattern ${re}`);
        violations++;
      }
    }
  });
}

if (violations > 0) {
  console.error(`\n${violations} token-conformance violations. Fix before commit.`);
  process.exit(1);
}
console.log('token-conformance: clean — no ported classes, no hardcoded colors.');