#!/usr/bin/env node
// gen-sbom — walk every P31 worker + package dir and emit one fleet
// CycloneDX 1.6 JSON BOM. Plain node, zero deps.
//
//   node scripts/gen-sbom.mjs [--worker <name>] [-o out.json] [--root <dir>]
//
// Defaults: walk /home/p31/production/{workers,packages}/*/package.json,
// output /home/p31/production/catalog-sbom.json.
//
// SBOM-honesty (runbook §4 E-3): a worker whose package.json is missing or
// unparseable becomes an INCOMPLETE component entry (annotations + comment),
// never a crash and never a silent omission. Every dir under workers/ and
// packages/ appears in the BOM.
import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = process.env.P31_REPO ?? join(HERE, '..');
const DEFAULT_OUT = join(REPO_ROOT, 'catalog-sbom.json');
const VERSION = '1.0.0';
const SPEC_VERSION = '1.6';

function fail(message) {
  console.error(`gen-sbom: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const args = { worker: null, out: DEFAULT_OUT, root: REPO_ROOT };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') { printUsage(); process.exit(0); }
    else if (a === '--worker') args.worker = argv[++i];
    else if (a === '-o' || a === '--out') args.out = argv[++i];
    else if (a === '--root') args.root = argv[++i];
    else fail(`unknown flag: ${a}`);
  }
  if (!args.worker && !args.out) args.out = DEFAULT_OUT;
  return args;
}

function printUsage() {
  console.log(`gen-sbom ${VERSION} — fleet CycloneDX 1.6 BOM generator

usage: node scripts/gen-sbom.mjs [options]

options:
  --worker <name>   emit the BOM for one worker only (dir basename or package name)
  -o, --out <file>  output path (default: ${DEFAULT_OUT})
  --root <dir>      repo root to walk (default: ${REPO_ROOT})`);
}

async function dirEntries(root) {
  const list = [];
  for (const kind of ['workers', 'packages']) {
    const base = join(root, kind);
    let names = [];
    try { names = await readdir(base); } catch { continue; }
    for (const name of names) {
      const full = join(base, name);
      const s = await stat(full).catch(() => null);
      if (s?.isDirectory()) list.push({ kind, name, dir: full });
    }
  }
  return list;
}

/** Read + parse a package.json; returns {pkg} or {problem} — never throws. */
async function loadPackage(dir) {
  const path = join(dir, 'package.json');
  let text;
  try { text = await readFile(path, 'utf8'); } catch { return { problem: 'incomplete: missing package.json' }; }
  try { return { pkg: JSON.parse(text) }; } catch { return { problem: 'incomplete: unparseable package.json' }; }
}

/** Normalize a package.json license field into CycloneDX license objects. */
function licensesOf(pkg) {
  const out = [];
  const raw = pkg?.license ?? pkg?.licenses;
  if (typeof raw === 'string' && raw.trim()) out.push(raw.trim());
  else if (raw && typeof raw === 'object' && typeof raw.type === 'string') out.push(raw.type);
  else if (Array.isArray(raw)) {
    for (const l of raw) {
      if (typeof l === 'string' && l.trim()) out.push(l.trim());
      else if (l && typeof l.type === 'string') out.push(l.type);
    }
  }
  return out.map((name) => ({ license: { name } }));
}

/** name@version purls for dependencies + devDependencies (sorted, deduped). */
function depPurls(pkg) {
  const seen = new Set();
  const out = [];
  for (const field of ['dependencies', 'devDependencies']) {
    const deps = pkg?.[field];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, version] of Object.entries(deps)) {
      const v = typeof version === 'string' && version.trim() ? version.trim() : '0.0.0-unknown';
      const purl = `pkg:npm/${name}@${v}`;
      if (!seen.has(purl)) { seen.add(purl); out.push(purl); }
    }
  }
  return out.sort();
}

function annotateIncomplete(component, ref, text, timestamp) {
  component.comment = text;
  component.annotations = [{
    subjects: [ref],
    annotator: { organization: { name: 'p31' }, tool: `gen-sbom@${VERSION}` },
    text,
    timestamp,
  }];
}

function componentFor(entry, timestamp) {
  const ref = `p31:${entry.kind}/${entry.name}`;
  const base = {
    type: 'application',
    'bom-ref': ref,
    name: entry.name,
    properties: [{ name: 'p31:kind', value: entry.kind }],
  };
  const loaded = entry.loaded;
  if (loaded.problem) {
    const c = { ...base, version: '0.0.0-unknown' };
    annotateIncomplete(c, ref, `${loaded.problem} (${entry.dir})`, timestamp);
    return { component: c, purls: [], complete: false };
  }
  const pkg = loaded.pkg;
  const c = { ...base, version: String(pkg?.version ?? '0.0.0-unknown') };
  const declaredName = typeof pkg?.name === 'string' && pkg.name !== entry.name ? pkg.name : null;
  const props = [{ name: 'p31:kind', value: entry.kind }];
  if (declaredName) props.push({ name: 'p31:package-name', value: declaredName });
  c.properties = props;
  if (typeof pkg?.description === 'string' && pkg.description) c.description = pkg.description;
  const licenses = licensesOf(pkg);
  if (licenses.length) c.licenses = licenses;
  return { component: c, purls: depPurls(pkg), complete: true };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const entries = await dirEntries(args.root);
  if (entries.length === 0) fail(`no workers/* or packages/* directories found under ${args.root}`);

  let chosen = entries;
  if (args.worker) {
    const loaded = [];
    for (const e of entries) {
      e.loaded = await loadPackage(e.dir);
      loaded.push(e);
    }
    chosen = loaded.filter((e) =>
      e.name === args.worker ||
      (e.loaded.pkg && (e.loaded.pkg.name === args.worker || e.loaded.pkg.name === `@p31ca/${args.worker}`)),
    );
    if (chosen.length === 0) fail(`no worker/package matching --worker "${args.worker}" (checked ${entries.length} dirs)`);
    entries.splice(0, entries.length, ...chosen);
  } else {
    for (const e of entries) e.loaded = await loadPackage(e.dir);
  }

  const timestamp = new Date().toISOString();
  const components = [];
  const dependencies = [];
  let incomplete = 0;
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const { component, purls, complete } = componentFor(e, timestamp);
    components.push(component);
    if (!complete) incomplete += 1;
    dependencies.push({ ref: component['bom-ref'], dependsOn: purls });
  }

  const bom = {
    bomFormat: 'CycloneDX',
    specVersion: SPEC_VERSION,
    serialNumber: `urn:uuid:${randomUUID()}`,
    version: 1,
    metadata: {
      timestamp,
      tools: [{ vendor: 'p31', name: 'gen-sbom', version: VERSION }],
      component: {
        type: 'application',
        'bom-ref': 'p31:fleet',
        name: 'p31-production-fleet',
        version: VERSION,
        description: args.worker
          ? `P31 SBOM — filtered to worker "${args.worker}"`
          : 'P31 production fleet SBOM (workers/* + packages/*)',
      },
    },
    components,
    dependencies,
  };
  if (incomplete > 0) {
    bom.annotations = [{
      subjects: [bom.metadata.component['bom-ref']],
      annotator: { organization: { name: 'p31' }, tool: `gen-sbom@${VERSION}` },
      text: `honesty note: ${incomplete} component(s) marked incomplete (missing or unparseable package.json)`,
      timestamp,
    }];
  }

  await writeFile(args.out, JSON.stringify(bom, null, 2) + '\n');
  console.log(`gen-sbom: ${components.length} components (${incomplete} incomplete) → ${args.out}`);
  console.log(`gen-sbom: serialNumber=${bom.serialNumber} timestamp=${timestamp}`);
}

main().catch((e) => {
  console.error(`gen-sbom: unexpected error: ${e?.message ?? e}`);
  process.exit(1);
});