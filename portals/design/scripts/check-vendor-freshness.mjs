#!/usr/bin/env node
/**
 * check-vendor-freshness.mjs — the vendor-staleness gate.
 *
 * The design portal consumes canonical workspace packages (design-core, canon)
 * as vendored tarballs. The portal is the REFERENCE — it must show the CURRENT
 * system, not a stale snapshot. This gate fails if any vendor tarball's version
 * does not match the workspace package it was packed from.
 *
 * Fixed forks (@p31ca/ui, packed from tools/portal-vendor-sync/ui-src) and
 * external vendors (ambient, shell-chrome) are skipped — they are not workspace
 * packages.
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const portal = resolve(here, '..');
const vendor = join(portal, 'vendor');
const root = resolve(portal, '..', '..');

const workspace = new Map();
for (const d of ['packages', 'apps', 'workers']) {
  const dir = join(root, d);
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry, 'package.json');
    if (!existsSync(p)) continue;
    try {
      const j = JSON.parse(readFileSync(p, 'utf8'));
      if (j.name && j.version) workspace.set(j.name, j.version);
    } catch {}
  }
}

// Fixed vendored forks whose version intentionally differs from the workspace.
const FIXED = new Set(['@p31ca/ui']);

const problems = [];
for (const f of readdirSync(vendor)) {
  if (!f.endsWith('.tgz')) continue;
  let name, version;
  try {
    const pkg = JSON.parse(execSync(`tar -xzOf "${join(vendor, f)}" package/package.json`, { encoding: 'utf8' }));
    name = pkg.name;
    version = pkg.version;
  } catch {
    continue;
  }
  if (FIXED.has(name)) continue;
  const wsVersion = workspace.get(name);
  if (wsVersion === undefined) continue; // external vendor (ambient, shell-chrome, ...)
  if (wsVersion !== version) problems.push(`${f}: ${name}@${version} (workspace ${wsVersion})`);
}

if (problems.length) {
  console.error('✗ check-vendor-freshness: stale vendor tarballs:');
  problems.forEach((p) => console.error(`   ${p}`));
  process.exit(1);
}
console.log('✅ check-vendor-freshness: vendor tarballs match workspace versions.');