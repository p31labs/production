#!/usr/bin/env node
/**
 * canon-source-audit — fork-detection gate (consume-don't-fork).
 *
 * BLOCKING gate. Fails a portal/app when it:
 *   R1  defines `--p31-*` tokens in a portal-owned CSS file
 *       (tokens must be imported from @p31ca/design-core, never re-defined)
 *   R2  exports a component that duplicates an @p31ca/design-core/compositions
 *       export (the canon already ships it; portals must import)
 *
 * This is the root-cause gate the earlier sessions lacked: token-audit catches
 * raw hex, canon-purity catches NaN, parity catches visual drift — but none
 * caught the FORGE FORK (a portal re-defining --p31-* tokens and hand-rolling
 * Topbar that the canon already exports). This gate fails that at source.
 *
 * Usage:
 *   node canon-source-audit.mjs                      # scan production/portals + apps
 *   node canon-source-audit.mjs --target <path>      # scan one tree
 *   node canon-source-audit.mjs --allow <comma,list> # allow specific fork files (migration in progress)
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = resolve(fileURLToPath(new URL('.', import.meta.url)));
const ROOT = resolve(HERE, '..', '..', '..'); // /home/p31
const CANON_COMPOSITIONS = resolve(ROOT, 'production', 'packages', 'design-core', 'src', 'compositions', 'index.ts');

/** The canon's component export names (read live from design-core — the gate
 *  stays correct as the canon grows). */
function canonExports() {
  try {
    const src = readFileSync(CANON_COMPOSITIONS, 'utf8');
    const names = new Set();
    for (const m of src.matchAll(/export\s+\{\s*([^}]+)\s*\}/g)) {
      for (const part of m[1].split(',')) {
        const name = part.trim().split(' as ')[0].split(':')[0].trim();
        if (name && !name.startsWith('type')) names.add(name);
      }
    }
    return names;
  } catch { return new Set(); }
}

function parseArgs() {
  const a = process.argv.slice(2);
  const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  return {
    target: get('--target'),
    allow: (get('--allow') ?? '').split(',').filter(Boolean),
  };
}

function* walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', 'dist', 'build', 'out', '.astro', 'coverage', '.slop-cache'].includes(e.name)) continue;
      yield* walk(p);
    } else if (/\.(css|tsx|ts)$/.test(e.name)) {
      yield p;
    }
  }
}

/** The trees to scan: production/portals/<name>/src + workspace apps/<name>/src */
function scanRoots() {
  const roots = [];
  const portalRoot = join(ROOT, 'production', 'portals');
  if (existsSync(portalRoot)) {
    for (const e of readdirSync(portalRoot, { withFileTypes: true })) {
      if (e.isDirectory()) {
        const src = join(portalRoot, e.name, 'src');
        if (existsSync(src)) roots.push({ label: `portal/${e.name}`, src });
      }
    }
  }
  const appRoot = join(ROOT, 'production', 'apps');
  if (existsSync(appRoot)) {
    for (const e of readdirSync(appRoot, { withFileTypes: true })) {
      if (e.isDirectory()) {
        const src = join(appRoot, e.name, 'src');
        if (existsSync(src)) roots.push({ label: `app/${e.name}`, src });
      }
    }
  }
  return roots;
}

function main() {
  const args = parseArgs();
  const canon = canonExports();
  if (args.target) {
    // Failing-loud guard: a --target that resolves to a nonexistent dir must
    // exit with a named usage error, NOT silently skip and report a false green
    // (the false-clean trap — a relative target from the wrong cwd vanishes).
    const resolved = resolve(args.target);
    if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
      console.error(`✗ canon-source-audit: --target does not resolve to an existing directory: ${args.target} (resolved ${resolved})`);
      process.exit(2);
    }
  }
  const targets = args.target ? [{ label: `target`, src: resolve(args.target) }] : scanRoots();
  const failures = [];

  for (const { label, src } of targets) {
    for (const file of walk(src)) {
      const content = readFileSync(file, 'utf8');
      const rel = relative(ROOT, file);
      if (args.allow.includes(rel)) continue;

      // R1 — token fork vs adapter. A portal CSS file may define `--p31-*` ONLY
      // as an ADAPTER: a legacy alias whose value REFERENCES a DIFFERENT canon
      // token (`var(--p31-…)`, not itself), so it inherits canon changes. A
      // value that does not reference the canon, or that references itself
      // (a cycle), is a FORK or a bug — the portal invented its own value.
      if (/\.css$/.test(file)) {
        const tokenDefs = [...content.matchAll(/(?:^|\s)(--p31-[a-z0-9-]+)\s*:\s*([^;{}]+)/gm)].map((m) => ({ name: m[1], value: m[2].trim() }));
        const forks = tokenDefs.filter((t) => {
          const selfRef = new RegExp(`var\\(${t.name}\\b`).test(t.value);
          if (selfRef) return true;      // a cycle resolves to guaranteed-invalid
          return !/var\(--p31-/.test(t.value); // no canon reference = invented value
        });
        if (forks.length > 0) {
          failures.push({
            rule: 'token-fork',
            file: rel,
            detail: `defines ${forks.length} non-adapter --p31-* tokens (${forks.slice(0, 3).map((f) => `${f.name}: ${f.value}`).join('; ')}) — adapter values must reference a different canon token via var(--p31-…); import from @p31ca/design-core instead`,
          });
        }
      }

      // R2 — component duplicate: exports a name the canon compositions already export.
      // A file is a CONSUMER (not a fork) ONLY when it imports the SAME name it
      // exports from @p31ca/design-core — a wrapper that re-composes the canon
      // component (or a barrel re-export). Importing ANY canon symbol (e.g. a
      // token) while hand-rolling a same-named component is still a FORK: the
      // name-import guard is per-component, not a blanket escape hatch.
      if (/\.tsx?$/.test(file) && /\/components?\//.test(file)) {
        const exportNames = [...content.matchAll(/export\s+(?:function|const|class)\s+(\w+)/g)].map((m) => m[1]);
        for (const name of exportNames) {
          // Does this file import the SAME component name from canon?
          const importsSelf =
            new RegExp(`import\\s*\\{[^}]*\\b${name}\\b[^}]*\\}\\s*from\\s*['"]@p31ca\\/design-core`).test(content) ||
            new RegExp(`from\\s*['"]@p31ca\\/design-core\\/compositions\\/${name}['"]`).test(content) ||
            new RegExp(`import\\s+${name}\\s+from\\s*['"]@p31ca\\/design-core`).test(content) ||
            new RegExp(`import\\s+\\*\\s+as\\s+${name}\\s+from\\s*['"]@p31ca\\/design-core`).test(content);
          if (canon.has(name) && !importsSelf) {
            failures.push({
              rule: 'component-duplicate',
              file: rel,
              detail: `exports "${name}" which already exists in @p31ca/design-core/compositions — import it instead`,
            });
          }
        }
      }
    }
  }

  if (failures.length > 0) {
    console.error(`✗ canon-source-audit FAILED — ${failures.length} fork(s) detected:`);
    for (const f of failures) console.error(`  [${f.rule}] ${f.file}: ${f.detail}`);
    console.error(`  → import ${failures.length === 1 ? 'this' : 'these'} from @p31ca/design-core; do not re-define.`);
    process.exit(1);
  }
  console.log('✅ canon-source-audit: no token forks, no component duplicates.');
  process.exit(0);
}

main();