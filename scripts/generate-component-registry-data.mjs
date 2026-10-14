#!/usr/bin/env node
/**
 * generate-component-registry-data.mjs — keep the legacy component-registry
 * MCP surface's COMPONENTS array aligned with the canonical component
 * definitions.
 *
 * Source of truth: packages/design-core/src/componentDefs.ts (32 components).
 * Targets (both patched between GENERATED markers — everything else in those
 * files is hand-maintained):
 *   - cli/component-registry.js                (stdio MCP server)
 *   - workers/component-registry/src/registry.js  (HTTP MCP worker)
 *
 * The component-registry MCP is DEPRECATED in favor of the canonical
 * design-mcp registry (packages/design-core/registry.json), but its tool
 * surface (design_list_components / design_get_component / design_search /
 * design_get_tokens / design_spoon_guide) stays alive; this script keeps the
 * component data canonical so the surface doesn't serve stale PHOS-era names.
 *
 * Usage:
 *   node scripts/generate-component-registry-data.mjs            # patch both files
 *   node scripts/generate-component-registry-data.mjs --check    # validate (CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DEFS = resolve(here, '..', 'packages', 'design-core', 'src', 'componentDefs.ts');
const CLI_FILE = resolve(here, '..', 'cli', 'component-registry.js');
const WORKER_FILE = resolve(here, '..', 'workers', 'component-registry', 'src', 'registry.js');

const CHECK = process.argv.includes('--check');
const BEGIN = /\/\/ ── BEGIN GENERATED COMPONENTS ──+\s*\n/;
const END = /\/\/ ── END GENERATED COMPONENTS ──+/;

function oneLine(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\s+/g, ' ').trim();
}

function oneLineArray(list) {
  if (!Array.isArray(list)) return [];
  return list.map(oneLine).filter(Boolean);
}

/** Deterministic usage example: first defs guidance example when it is
 *  markup, else a css_class-based skeleton. */
function deriveExample(def) {
  const examples = oneLineArray(def.aiGuidance?.examples);
  const first = examples.find((e) => e.startsWith('<'));
  if (first) return first;
  return `<div class="${def.css_class}">...</div>`;
}

function buildEntry(name, def) {
  return {
    name,
    description: oneLine(def.description || ''),
    css_class: def.css_class,
    category: def.category,
    status: def.status || 'stable',
    tier: def.tier,
    tokens: def.tokens || [],
    props: def.props || {},
    slots: def.slots || [],
    variants: def.variants || [],
    accessibility: oneLineArray(def.accessibility),
    aiGuidance: {
      useWhen: oneLineArray(def.aiGuidance?.useWhen),
      avoidWhen: oneLineArray(def.aiGuidance?.avoidWhen),
      examples: oneLineArray(def.aiGuidance?.examples),
    },
    example: deriveExample(def),
  };
}

function renderBlock(declaration, entries) {
  const items = entries
    .map((e) => JSON.stringify(e, null, 2).split('\n').map((l, i) => (i === 0 ? `  ${l}` : `  ${l}`)).join('\n'))
    .join(',\n');
  return `${declaration} = [\n${items}\n];`;
}

function patchFile(file, declaration, entries) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('// ── BEGIN GENERATED COMPONENTS');
  const endIdx = source.indexOf('// ── END GENERATED COMPONENTS');
  if (start === -1 || endIdx === -1) {
    throw new Error(`${file}: missing GENERATED COMPONENTS markers`);
  }
  const endLineEnd = source.indexOf('\n', endIdx);
  const head = source.slice(0, start);
  const tail = source.slice(endLineEnd + 1);
  const block = renderBlock(declaration, entries);
  return `${head}// ── BEGIN GENERATED COMPONENTS ───────────────────────────────────────────────────────\n${block}\n// ── END GENERATED COMPONENTS ─────────────────────────────────────────────────────────\n${tail}`;
}

async function main() {
  let defs;
  try {
    defs = await import(DEFS);
  } catch (err) {
    console.error(
      `generate-component-registry-data: cannot load ${DEFS} — requires Node >= 23.6 ` +
      `(native TS type-stripping) or run via tsx. ${err.message}`
    );
    process.exit(1);
  }

  const COMPONENT_DEFS = defs.COMPONENT_DEFS;
  const entries = Object.keys(COMPONENT_DEFS).map((name) => buildEntry(name, COMPONENT_DEFS[name]));

  const patches = [
    { file: CLI_FILE, decl: 'const COMPONENTS' },
    { file: WORKER_FILE, decl: 'export const COMPONENTS' },
  ];

  if (CHECK) {
    let ok = true;
    for (const { file, decl } of patches) {
      const source = readFileSync(file, 'utf8');
      const regenerated = patchFile(file, decl, entries);
      if (regenerated !== source) {
        console.error(`generate-component-registry-data --check: ${file} is out of date. Run the generator.`);
        ok = false;
      }
    }
    if (!ok) process.exit(1);
    console.log(`generate-component-registry-data --check: OK (${entries.length} components).`);
    return;
  }

  for (const { file, decl } of patches) {
    writeFileSync(file, patchFile(file, decl, entries));
    console.log(`Patched ${file} (${entries.length} components).`);
  }
}

main();