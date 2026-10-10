#!/usr/bin/env node
/**
 * gen-adoption.mjs — the adoption signal.
 *
 * Statically scans apps/, portals/, workers/ for `@p31ca/design-core/compositions`
 * imports and aggregates which components each surface consumes. This is the
 * first real adoption signal — the system knowing it is being used, not just
 * built. Emits src/data/adoption.json.
 *
 * Run: node portals/design/scripts/gen-adoption.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const portal = resolve(here, '..');
const root = resolve(portal, '..', '..');

const SURFACE_DIRS = ['apps', 'portals', 'workers'];
const SKIP = new Set(['node_modules', 'dist', '.git', 'vendor', 'coverage', '.turbo', 'build', 'public']);
const IMPORT_RE = /from\s+['"]@p31ca\/design-core\/compositions['"]/;
const NAMED_RE = /\{\s*([^}]+)\s*\}/;

/** Recursively collect source files that import the compositions module. */
function collect(dir, out) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    if (SKIP.has(entry)) continue;
    const full = join(dir, entry);
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) collect(full, out);
    else if (/\.(tsx|ts|jsx|js|astro)$/.test(entry)) out.push(full);
  }
}

// component name -> Set of surface dirs (first two path segments)
const usage = new Map();
const surfaceFiles = new Set();

for (const d of SURFACE_DIRS) {
  const files = [];
  collect(join(root, d), files);
  for (const f of files) {
    let src;
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    if (!IMPORT_RE.test(src)) continue;
    const rel = f.replace(root + '/', '');
    const surface = rel.split('/').slice(0, 2).join('/');
    surfaceFiles.add(surface);
    for (const line of src.split('\n')) {
      const m = line.match(/import\s+\{([^}]+)\}\s+from\s+['"]@p31ca\/design-core\/compositions['"]/);
      if (!m) continue;
      for (const name of m[1].split(',')) {
        const c = name.trim().replace(/\s+as\s+\w+$/, '').trim();
        if (!c || c === 'type' || c.startsWith('type ')) continue;
        const clean = c.replace(/^type\s+/, '');
        if (!usage.has(clean)) usage.set(clean, new Set());
        usage.get(clean).add(surface);
      }
    }
  }
}

const components = [...usage.entries()].map(([name, surfaces]) => ({
  name,
  surfaces: [...surfaces],
  surfaceCount: surfaces.size,
})).sort((a, b) => b.surfaceCount - a.surfaceCount);

const payload = {
  generatedAt: new Date().toISOString(),
  surfaces: surfaceFiles.size,
  components: components,
  componentCount: components.length,
  unused: [], // filled by the caller (registry components with no consumer)
};

writeFileSync(join(portal, 'src', 'data', 'adoption.json'), JSON.stringify(payload, null, 2) + '\n');
console.log(`adoption: ${components.length} components consumed across ${surfaceFiles.size} surfaces`);