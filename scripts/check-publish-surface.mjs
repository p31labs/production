#!/usr/bin/env node
/**
 * check-publish-surface.mjs — the publish-surface guard.
 *
 * pnpm -r publish publishes every workspace package with an unpublished version
 * and no `private` guard. After the @p31 → @p31ca migration, a handful of
 * apps/workers kept unscoped names and no private flag, and pnpm -r publish
 * shipped them to npm under colliding names (`p31ca`, `planetary-planet`).
 *
 * This gate fails if any workspace package is both non-private and not scoped
 * under the canonical scope. Only libraries ship; apps and workers must be
 * private.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

// Derive the publish surface from pnpm-workspace.yaml so the guard can never
// drift from the workspace config. We only support the `base/*` glob form the
// root workspace uses; nested workspaces (portals/, shell/, monetization/,
// apps/counterscale) carry their own pnpm-workspace.yaml and are NOT part of
// this surface — pnpm -r publish from the root never traverses into them.
const ws = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8');
const baseDirs = ws
  .split('\n')
  .filter((l) => /^\s*-\s+\S+\/\*/.test(l))
  .map((l) => l.trim().replace(/^-\s*/, '').replace(/\/\*$/, ''))
  .filter(Boolean);

const offenders = [];
for (const base of baseDirs) {
  const dir = join(ROOT, base);
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry, 'package.json');
    if (!existsSync(p)) continue;
    let j;
    try { j = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
    if (!j.name || j.private) continue;
    if (j.name.startsWith('@p31ca/')) continue;
    offenders.push(`${j.name} (${base}/${entry})`);
  }
}

if (offenders.length) {
  console.error('✗ check-publish-surface: non-private unscoped packages would publish:');
  offenders.forEach((o) => console.error(`   ${o}`));
  process.exit(1);
}
console.log('✅ check-publish-surface: every non-private package is @p31ca/ scoped.');