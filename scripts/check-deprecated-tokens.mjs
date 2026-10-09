#!/usr/bin/env node
/**
 * check-deprecated-tokens.mjs — the deprecation enforcement gate.
 *
 * Reads the deprecation manifest (packages/canon/deprecations.json — the flat
 * --p31-* → $deprecated map) and scans design-core's component CSS for
 * var(--p31-*) references. Fails if any consumer references a deprecated token.
 *
 * The 162 deprecated tokens are, by definition, dead (no consumer), so the gate
 * passes today. The negative control: plant a var(--p31-glow-neon) in a
 * component stylesheet, run the gate, confirm exit 1, revert.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MANIFEST = join(ROOT, 'packages', 'canon', 'deprecations.json');
const CSS_DIR = join(ROOT, 'packages', 'design-core', 'src', 'css');

if (!existsSync(MANIFEST)) {
  console.warn('check-deprecated-tokens SKIP — no deprecation manifest');
  process.exit(0);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const deprecated = new Set(Object.keys(manifest));

const consumers = new Map(); // token -> [file]
for (const f of readdirSync(CSS_DIR)) {
  if (!f.endsWith('.css')) continue;
  const text = readFileSync(join(CSS_DIR, f), 'utf8');
  for (const m of text.matchAll(/var\((--p31-[a-z0-9-]+)/g)) {
    if (deprecated.has(m[1])) {
      const list = consumers.get(m[1]) ?? [];
      list.push(f);
      consumers.set(m[1], list);
    }
  }
}

if (consumers.size > 0) {
  console.error('✗ check-deprecated-tokens: consumers reference deprecated tokens:');
  for (const [token, files] of consumers) {
    console.error(`   ${token} → ${files.join(', ')} (${manifest[token].$deprecated})`);
  }
  process.exit(1);
}

const unclaimed = deprecated.size - 0;
console.log(
  `✅ check-deprecated-tokens: 0 consumers use deprecated tokens (${deprecated.size} deprecated, none referenced)`,
);