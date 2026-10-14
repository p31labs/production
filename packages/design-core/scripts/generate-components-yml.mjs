#!/usr/bin/env node
/**
 * @file generate-components-yml.mjs — emit cli/tokens/components.yml from the
 * canonical component definitions.
 *
 * Source of truth: packages/design-core/src/componentDefs.ts (32 components).
 * The yml is a DERIVED artifact — never hand-edit it. Regenerate:
 *
 *   node packages/design-core/scripts/generate-components-yml.mjs          # write
 *   node packages/design-core/scripts/generate-components-yml.mjs --check  # validate (CI)
 *
 * Shape decisions (locked, see docs/fix-plans/catalog-pipeline-divergence.md):
 *   - token paths are emitted exactly as the defs carry them (p31.* DTCG /
 *     short paths — canonical vocabulary, matches canon tokens.dtc.json).
 *   - `aiGuidance` is the ARRAY form (useWhen/avoidWhen/examples), the new
 *     canonical shape (defs form).
 *   - `tool` is derived deterministically: `render` + component name (the
 *     legacy components.yml convention).
 *   - `props.options` is only emitted when the defs actually define options
 *     (currently none do) — otherwise omitted.
 *   - output is deterministic: defs insertion order, fixed key order, block
 *     YAML style, no timestamps, strings collapsed to single lines.
 *
 * The output stays parseable by both the `yaml` package (CLI consumers) and
 * the design-core generator's minimal `parseYamlSimple` (shared.ts).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const DEFS = resolve(here, '..', 'src', 'componentDefs.ts');
const OUT = resolve(here, '..', '..', '..', 'cli', 'tokens', 'components.yml');

const CHECK = process.argv.includes('--check');

/** Collapse newlines/whitespace so yaml output stays single-line (block-style
 *  YAML would otherwise emit `|` scalars, which parseYamlSimple cannot read). */
function oneLine(value) {
  if (typeof value !== 'string') return value;
  return value.replace(/\s+/g, ' ').trim();
}

function oneLineArray(list) {
  if (!Array.isArray(list)) return [];
  return list.map(oneLine).filter(Boolean);
}

/** Deterministic props projection: defs React-style props → yml shape.
 *  `options` is emitted only when the def defines it (never currently). */
function projectProps(props) {
  if (!props || typeof props !== 'object') return {};
  const out = {};
  for (const [name, def] of Object.entries(props)) {
    const entry = {};
    entry.type = oneLine(def.type || 'string');
    if (def.required === true) entry.required = true;
    if (def.default !== undefined) entry.default = def.default;
    if (def.min !== undefined) entry.min = def.min;
    if (def.max !== undefined) entry.max = def.max;
    if (def.description) entry.description = oneLine(def.description);
    if (def.options) entry.options = def.options; // defs currently define none
    out[name] = entry;
  }
  return out;
}

function projectComponent(name, def) {
  return {
    description: oneLine(def.description || ''),
    css_class: def.css_class,
    tool: `render${name}`,
    category: def.category,
    aiGuidance: {
      useWhen: oneLineArray(def.aiGuidance?.useWhen),
      avoidWhen: oneLineArray(def.aiGuidance?.avoidWhen),
      examples: oneLineArray(def.aiGuidance?.examples),
    },
    props: projectProps(def.props),
    slots: def.slots || [],
    variants: def.variants || [],
    tokens: def.tokens || [],
    accessibility: def.accessibility || [],
    status: def.status || 'stable',
    tier: def.tier,
    version: def.version || '1.0.0',
    importPath: def.importPath,
  };
}

async function main() {
  let defs;
  try {
    defs = await import(DEFS);
  } catch (err) {
    console.error(
      `generate-components-yml: cannot load ${DEFS} — requires Node >= 23.6 ` +
      `(native TS type-stripping) or run via tsx. ${err.message}`
    );
    process.exit(1);
  }

  const COMPONENT_DEFS = defs.COMPONENT_DEFS;
  const names = Object.keys(COMPONENT_DEFS);
  const components = {};
  for (const name of names) {
    components[name] = projectComponent(name, COMPONENT_DEFS[name]);
  }

  const header = [
    '# P31 Design System — Component Registry (DERIVED ARTIFACT)',
    '# Generated from packages/design-core/src/componentDefs.ts by',
    '# packages/design-core/scripts/generate-components-yml.mjs — do not edit.',
    '# Canonical vocabulary: p31.* DTCG token paths (matches canon tokens.dtc.json).',
    '',
  ].join('\n');

  const doc = { version: '2.0', components };
  const body = yaml.stringify(doc, {
    collectionStyle: 'block', // parseYamlSimple (shared.ts) requires block style
    lineWidth: 0,             // no folding — every scalar stays on one line
  });

  const output = header + body;

  if (CHECK) {
    let current = '';
    try {
      current = readFileSync(OUT, 'utf8');
    } catch {
      console.error(`generate-components-yml --check: ${OUT} is missing. Run the generator.`);
      process.exit(1);
    }
    if (current !== output) {
      console.error(`generate-components-yml --check: ${OUT} is out of date. Run the generator.`);
      process.exit(1);
    }
    console.log(`generate-components-yml --check: OK (${names.length} components, deterministic).`);
    return;
  }

  writeFileSync(OUT, output);
  console.log(`Wrote ${OUT} (${names.length} components).`);
}

main();