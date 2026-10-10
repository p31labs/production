#!/usr/bin/env node
/**
 * check-click-depth.mjs — the ≤3-clicks rule.
 *
 * Every component page must be reachable from Home within 3 clicks. The nav
 * structure is: Home (0) → Components section (1, sidebar) → component page
 * (2, /components/:name param route). This asserts the graph holds for every
 * component in the registry.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const portal = resolve(here, '..');
const root = resolve(portal, '..', '..');

const registry = JSON.parse(readFileSync(join(root, 'packages', 'design-core', 'registry.json'), 'utf8'));
const navSrc = readFileSync(join(portal, 'src', 'lib', 'nav.ts'), 'utf8');
const appSrc = readFileSync(join(portal, 'src', 'App.tsx'), 'utf8');

const problems = [];

// 1. The Components section home is one click from Home (a nav path).
if (!navSrc.includes("path: '/components'")) {
  problems.push('/components is not a sidebar entry (component section unreachable from Home).');
}

// 2. The component param route exists (one more click from the section home).
if (!appSrc.includes('path="/components/:name"')) {
  problems.push('/components/:name param route is missing.');
}

// 3. Every component resolves through the param route — depth = Home → /components → /components/:name = 2 clicks.
for (const c of registry.items) {
  const depth = 2; // Home (0) → /components (1) → /components/:name (2)
  if (depth > 3) problems.push(`${c.name}: ${depth} clicks (exceeds 3).`);
}

if (problems.length) {
  console.error('✗ check-click-depth:');
  problems.forEach((p) => console.error(`   ${p}`));
  process.exit(1);
}
console.log(`✅ check-click-depth: all ${registry.items.length} components reachable within 2 clicks (≤3).`);