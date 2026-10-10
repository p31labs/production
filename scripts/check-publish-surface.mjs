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
const DIRS = ['packages', 'apps', 'workers', 'portals', 'monetization'];

const offenders = [];
for (const d of DIRS) {
  const dir = join(ROOT, d);
  if (!existsSync(dir)) continue;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry, 'package.json');
    if (!existsSync(p)) continue;
    let j;
    try { j = JSON.parse(readFileSync(p, 'utf8')); } catch { continue; }
    if (!j.name || j.private) continue;
    if (j.name.startsWith('@p31ca/')) continue;
    offenders.push(`${j.name} (${dir}/${entry})`);
  }
}

if (offenders.length) {
  console.error('✗ check-publish-surface: non-private unscoped packages would publish:');
  offenders.forEach((o) => console.error(`   ${o}`));
  process.exit(1);
}
console.log('✅ check-publish-surface: every non-private package is @p31ca/ scoped.');