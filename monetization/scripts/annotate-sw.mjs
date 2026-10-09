#!/usr/bin/env node
/**
 * annotate-sw — post-build: inject the hashed JS/CSS chunk list into dist/sw.js
 * so the service worker precaches the full app shell on install. On repeat
 * loads the shell + all chunks are served from cache — no network, no jank.
 *
 * Run AFTER `vite build`:  node scripts/annotate-sw.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DIST = join(here, '..', 'dist');
const SW = join(DIST, 'sw.js');

if (!process.env.CI) {
  const esm = join(here, '..', 'dist', 'assets');
  if (!readdirSync(esm, { withFileTypes: true }).length) {
    console.error('❌ dist/ is empty — run `vite build` before annotate-sw.');
    process.exit(1);
  }
}

const sw = readFileSync(SW, 'utf8');

// Collect hashed chunks from dist/assets.
const assets = readdirSync(join(DIST, 'assets')).filter((f) => /\.(js|css)$/.test(f));
const assetPaths = assets.map((f) => `/assets/${f}`);

// Existing precache entries in the install block.
const base = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

const re = /c\.addAll\(\[([\s\S]*?)\]\)/;
if (!re.test(sw)) {
  console.error('❌ Could not find the addAll precache array in sw.js.');
  process.exit(1);
}

const merged = Array.from(new Set([...base, ...assetPaths]));
const list = merged.map((p) => `'${p}'`).join(', ');
const patched = sw.replace(re, `c.addAll([${list}])`);

writeFileSync(SW, patched);
console.log(`✅ sw.js precache updated (${merged.length} entries):`);
for (const p of merged) console.log(`   ${p}`);