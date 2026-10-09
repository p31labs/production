#!/usr/bin/env node
/**
 * gen-ui-schema.mjs — canon → JSON schema (the THAKI validity path).
 *
 * Walks the P31 design registries and emits a single recursive JSON schema
 * that constrains what a Dreamer can emit. This is the registry-derived
 * constrained-decoding contract: component `type` is a closed enum, each
 * component's props are restricted per-component with additionalProperties:
 * false, and every token reference must live in the p31.* namespace.
 *
 * Sources:
 *   - packages/design-core/registry.json  (32 components + 18 chrome, typed
 *     props/tokens/variants/slots — the visual canon)
 *   - packages/canon/registry.json        (closed-vocabulary contracts:
 *     Badge, Button with enum-typed props)
 *
 * The THAKI result this encodes: registry-derived constrained decoding hits
 * 39/40 gate-pass with ZERO training. Validity is enforced by the schema, not
 * by fine-tuning.
 *
 * Output (default): ui-schema.json — a JSON Schema draft-07 document with:
 *   $defs.p31Component   — oneOf over every known component
 *   $defs.p31Props.<name>— per-component props object (additionalProperties:false)
 *   properties.type      — closed enum of component names
 *   properties.tokens    — p31.*-namespaced token strings
 *
 * Usage:
 *   node scripts/gen-ui-schema.mjs [--design-core <path>] [--canon <path>]
 *                                  [--out <path>]
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DEF_DESIGN_CORE = resolve(here, '../../design-core/registry.json');
const DEF_CANON = resolve(here, '../../canon/registry.json');
const DEF_OUT = resolve(here, '../ui-schema.json');

function arg(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const designCorePath = arg('--design-core') || DEF_DESIGN_CORE;
const canonPath = arg('--canon') || DEF_CANON;
const outPath = arg('--out') || DEF_OUT;

/** A registry item's prop type string → JSON Schema. Handles the TS shapes
 *  used across the registries: enum literal unions, primitives, arrays of
 *  typed nodes, callbacks, ReactNode, and `string | number` unions. */
function propTypeToSchema(typeStr, options) {
  const t = String(typeStr ?? '').trim();
  if (options && Array.isArray(options) && options.length > 0) {
    return { type: 'string', enum: options, description: 'closed enum from the contract' };
  }
  // Enum literal union: `'primary' | 'secondary' | 'ghost'` or `"primary" | "secondary"`
  // (design-core emits escaped double-quotes; canon emits single-quotes).
  const enumMatch = [...t.matchAll(/["']([^"']+)["']/g)];
  if (enumMatch.length >= 1 && !/^(string|number|boolean|object|array|null)$/.test(t) && t.split('|').every((part) => /^["']/.test(part.trim()) || part.includes('[]'))) {
    const enums = enumMatch.map((m) => m[1]);
    if (!t.includes('[]')) return { type: 'string', enum: enums };
  }
  // Array of typed nodes: `NavItem[]`, `DropdownOption[]`, etc.
  const arr = t.match(/^(.+)\[\]$/);
  if (arr) {
    return {
      type: 'array',
      items: { type: 'object', additionalProperties: true, description: `array element (${arr[1]})` },
    };
  }
  // Callback: `() => void`, `(checked: boolean) => void`.
  if (t.includes('=>')) {
    return { type: 'object', description: `callback (${t})`, nullable: true };
  }
  if (t.includes('ReactNode') || t.includes('Node')) {
    return { type: ['string', 'number', 'object', 'array', 'null'] };
  }
  if (t.includes('|')) {
    // Loose union — accept string or number.
    return { type: ['string', 'number'], description: t };
  }
  switch (t) {
    case 'string': return { type: 'string' };
    case 'number': return { type: 'number' };
    case 'boolean': return { type: 'boolean' };
    case 'CSSProperties': return { type: 'object', additionalProperties: true };
    case 'object': return { type: 'object', additionalProperties: true };
    default: return { type: ['string', 'number', 'boolean', 'object', 'array', 'null'], description: `unknown shape: ${t}` };
  }
}

function loadRegistry(p) {
  if (!existsSync(p)) {
    console.error(`registry not found: ${p}`);
    return { items: {}, components: [] };
  }
  return JSON.parse(readFileSync(p, 'utf8'));
}

const designCore = loadRegistry(designCorePath);
const canon = loadRegistry(canonPath);

const components = [];
const designItems = designCore.items ? Object.values(designCore.items) : [];
for (const it of designItems) {
  const props = {};
  for (const [name, p] of Object.entries(it.props ?? {})) {
    props[name] = {
      ...propTypeToSchema(p.type, p.options),
      description: p.description ?? '',
    };
  }
  components.push({
    name: it.name,
    category: it.category ?? 'surface',
    cssClass: it.cssClass ?? null,
    tokens: it.tokens ?? [],
    props,
    variants: it.variants ?? [],
    slots: it.slots ?? [],
    importPath: it.importPath ?? null,
  });
}

// Merge canon contract components (closed enum props + tokenContract).
for (const c of canon.components ?? []) {
  const props = {};
  for (const p of c.props ?? []) {
    props[p.name] = {
      ...(p.type === 'enum' && p.options?.length
        ? { type: 'string', enum: p.options }
        : propTypeToSchema(p.type, null)),
      description: p.description ?? '',
    };
  }
  components.push({
    name: c.name,
    category: 'contract',
    cssClass: null,
    tokens: c.tokens ?? [],
    props,
    variants: (c.variants && typeof c.variants === 'object' ? Object.values(c.variants).flat() : []) ?? [],
    slots: [],
    importPath: c.import ?? null,
  });
}

const names = components.map((c) => c.name);
const propDefs = {};
for (const c of components) {
  propDefs[c.name] = {
    type: 'object',
    additionalProperties: false,
    properties: c.props,
    required: Object.entries(c.props).filter(([, p]) => p.required).map(([n]) => n),
  };
}

const schema = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://p31ca.org/ui-forge/ui-schema.json',
  title: 'P31 UI Forge — constrained component-tree schema',
  description: `Registry-derived schema for Dreamer output. ${components.length} components (${names.length} unique) from design-core + canon. Emitted by scripts/gen-ui-schema.mjs.`,
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: names },
    props: { type: 'object' },
    tokens: {
      type: 'array',
      items: { type: 'string', pattern: '^p31([.][a-z][a-z0-9-]*)+$' },
      description: 'p31.*-namespaced token paths only.',
    },
    children: {
      type: 'array',
      items: { $ref: '#/$defs/p31Component' },
      description: 'nested component tree.',
    },
    id: { type: 'string', description: 'unique node id' },
    variants: {
      type: 'array',
      items: { type: 'string' },
    },
    dataBinding: {
      oneOf: [{ type: 'string' }, { type: 'null' }],
      description: 'backend data path this node consumes (Grounder-derived).',
    },
  },
  required: ['type'],
  $defs: {
    p31Component: {
      type: 'object',
      additionalProperties: false,
      properties: {
        type: { type: 'string', enum: names },
        props: {
          oneOf: names.map((n) => ({ $ref: `#/$defs/p31Props.${n}` })),
          description: 'props must satisfy the named component contract.',
        },
        tokens: {
          type: 'array',
          items: { type: 'string', pattern: '^p31([.][a-z][a-z0-9-]*)+$' },
        },
        children: {
          type: 'array',
          items: { $ref: '#/$defs/p31Component' },
        },
        id: { type: 'string' },
        dataBinding: { oneOf: [{ type: 'string' }, { type: 'null' }] },
      },
      required: ['type'],
    },
  },
};

// Each component's own $def (so `props` can resolve against it).
for (const c of components) {
  schema.$defs[`p31Props.${c.name}`] = propDefs[c.name];
}

// Summary payload (component catalog) alongside the schema — the Dreamer
// reads this as its vocabulary, the Shaper reads it to map names→canon.
const catalog = {
  schema: 'p31.uiForge/1.0.0',
  generatedFrom: [designCorePath, canonPath],
  components: components.map((c) => ({
    name: c.name,
    category: c.category,
    cssClass: c.cssClass,
    tokens: c.tokens,
    props: Object.entries(c.props).map(([name, p]) => ({ name, ...p })),
    variants: c.variants,
    slots: c.slots,
    importPath: c.importPath,
  })),
};

writeFileSync(outPath, JSON.stringify({ schema, catalog }, null, 2));
const wrote = components.length;
const tokenCount = new Set(components.flatMap((c) => c.tokens)).size;
console.log(`ui-schema written: ${outPath}`);
console.log(`  components: ${wrote}`);
console.log(`  unique token refs: ${tokenCount}`);
console.log(`  closed component enum: ${names.length} names`);