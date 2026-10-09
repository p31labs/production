#!/usr/bin/env node
/**
 * p31ca — the P31 design-system component CLI.
 *
 * Install canon components from @p31ca/design-core/registry.json into a portal.
 * P31-native, monorepo-scoped: paths resolve within the workspace tree.
 *
 * Collision semantics (the migration-critical behavior):
 *   - If the target file does not exist → install.
 *   - If the target file exists and MATCHES canon → no-op (already installed).
 *   - If the target file exists and DIFFERS → refuse + show the diff;
 *     require --force to overwrite. This is the drift detector the migration
 *     (Move 4) relies on — it never silently clobbers a fork.
 *
 * Usage:
 *   node cli/p31ca.mjs add <Name> --target <portal-src-dir> [--force]
 *   node cli/p31ca.mjs list [--category chrome]
 *   node cli/p31ca.mjs diff <Name> --target <portal-src-dir>
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(ROOT, 'registry.json');
const COMPOSITIONS = join(ROOT, 'src', 'compositions');

function loadRegistry() {
  if (!existsSync(REGISTRY)) {
    console.error('registry.json missing — run: node scripts/gen-registry.mjs');
    process.exit(2);
  }
  return JSON.parse(readFileSync(REGISTRY, 'utf8'));
}

function entry(name, registry) {
  const e = registry.items.find((i) => i.name === name);
  if (!e) {
    console.error(`Unknown component "${name}". Available: ${registry.items.map((i) => i.name).join(', ')}`);
    process.exit(1);
  }
  return e;
}

function parseArgs() {
  const a = process.argv.slice(2);
  const cmd = a[0];
  const get = (f) => { const i = a.indexOf(f); return i >= 0 ? a[i + 1] : undefined; };
  return {
    cmd,
    name: a[1],
    target: get('--target'),
    category: get('--category'),
    force: a.includes('--force'),
  };
}

function main() {
  const args = parseArgs();
  const registry = loadRegistry();

  if (args.cmd === 'list') {
    const items = registry.items.filter((i) => !args.category || i.category === args.category);
    for (const i of items) {
      console.log(`${i.name}\t${i.category}\t${i.status}\t${i.installable ? 'installable' : '—'}`);
    }
    console.log(`\n${items.length} components (${items.filter((i) => i.category === 'chrome').length} chrome)`);
    return;
  }

  if (args.cmd === 'diff' || args.cmd === 'add') {
    if (!args.name || !args.target) {
      console.error(`Usage: p31ca ${args.cmd} <Name> --target <portal-src-dir> [--force]`);
      process.exit(2);
    }
    const e = entry(args.name, registry);
    if (!e.installable) {
      console.error(`"${args.name}" is not installable (no compositions file).`);
      process.exit(1);
    }
    const canonSrc = readFileSync(join(COMPOSITIONS, `${args.name}.tsx`), 'utf8');
    const targetFile = join(resolve(args.target), 'components', `${args.name}.tsx`);

    if (!existsSync(targetFile)) {
      if (args.cmd === 'diff') {
        console.log(`"${args.name}": absent in target (nothing to diff).`);
        return;
      }
      mkdirSync(dirname(targetFile), { recursive: true });
      writeFileSync(targetFile, canonSrc);
      console.log(`✓ installed ${args.name} → ${targetFile}`);
      return;
    }

    const local = readFileSync(targetFile, 'utf8');
    if (local === canonSrc) {
      console.log(`"${args.name}": already matches canon (no-op).`);
      return;
    }

    // Drift: local differs from canon.
    if (args.cmd === 'diff') {
      console.log(`✗ "${args.name}" DRIFTED from canon:`);
      const aLines = local.split('\n');
      const bLines = canonSrc.split('\n');
      let shown = 0;
      for (let i = 0; i < Math.max(aLines.length, bLines.length) && shown < 8; i++) {
        if (aLines[i] !== bLines[i]) {
          console.log(`  L${i + 1}: local ${JSON.stringify(aLines[i] ?? '')} vs canon ${JSON.stringify(bLines[i] ?? '')}`);
          shown++;
        }
      }
      return;
    }

    // add with a collision
    if (!args.force) {
      console.error(`✗ "${args.name}" exists and DIFFERS from canon. Refusing to overwrite.`);
      console.error(`  Run \`p31ca diff ${args.name} --target ${args.target}\` to see the drift, or pass --force.`);
      process.exit(1);
    }
    writeFileSync(targetFile, canonSrc);
    console.log(`! overwrote ${args.name} → ${targetFile} (--force)`);
    return;
  }

  console.error('Usage: p31ca <add|list|diff> …');
  process.exit(2);
}

main();