/**
 * shaper.mjs — the fourth tetrahedral vertex.
 *
 * SHAPER: form — compose survivors. Adds nothing new, only gives form.
 *
 * The deterministic enforcement layer ("reason free, constrain late" — THAKI).
 * The Dreamer reasons freely; the Shaper constrains: it validates a candidate
 * tree against the ui-schema (closed enum of component types, per-component
 * props, p31.* tokens) and REPAIRS violations deterministically:
 *   - unknown component type  → drop the node (or replace with a known one)
 *   - enum prop outside closed set → clamp to the declared default / first
 *   - undeclared prop         → drop it
 *   - missing required prop   → fill from the declared default if present
 *   - non-p31 token ref       → drop it (a token not in the namespace does
 *     not exist)
 *
 * It also maps each surviving component name → its canon import path,
 * cssClass, and allowed tokens (from the schema catalog) so the renderer
 * knows exactly what to render. This is "the canon applied", not "the canon
 * reinvented".
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nearestToken, coerceType } from './repair.mjs';

let _schema = null;
function loadSchema(override) {
  if (override?.properties?.type?.enum && override?.catalog?.components?.length) {
    return override; // injected schema (Workers runtime) — no node:fs
  }
  if (_schema) return _schema;
  // Lazy: only touch node:path/url when actually reading from disk (Node CLI).
  const here = dirname(fileURLToPath(import.meta.url));
  const raw = JSON.parse(readFileSync(resolve(here, '../ui-schema.json'), 'utf8'));
  _schema = { ...raw.schema, catalog: raw.catalog };
  return _schema;
}

/** Whether a node's type is a known component. */
function knownTypes(override) {
  return new Set(loadSchema(override).properties.type.enum);
}

/** The canonical component catalog: name → { importPath, cssClass, tokens }
 *  The catalog stores token names WITHOUT the p31. prefix (design-core
 *  convention: `surface.bg`), while the schema namespace is `p31.*`. The
 *  Shaper compares BOTH forms so a `p31.surface.bg` ref maps to the catalog's
 *  `surface.bg` entry. */
function catalogByName(override) {
  const cat = new Map();
  for (const c of loadSchema(override).catalog.components) {
    const allowed = new Set();
    for (const t of c.tokens ?? []) {
      allowed.add(t);
      allowed.add(t.startsWith('p31.') ? t : `p31.${t}`);
    }
    cat.set(c.name, { ...c, _allowed: allowed });
  }
  return cat;
}

function isP31Token(t) {
  return /^p31([.][a-z][a-z0-9-]*)+$/.test(t);
}

/** The primitive type hint a prop def implies ('number'|'boolean'|'string'),
 *  for coerceType during enum repair. Handles both single types and the
 *  type-array form used by polymorphic props. */
function enumTypeHint(def) {
  const types = Array.isArray(def.type) ? def.type : [def.type];
  for (const t of types) {
    if (t === 'number' || t === 'boolean' || t === 'string') return t;
  }
  return undefined;
}

/** Repair one node in place. Returns the repaired node (or null to drop it).
 *  `tokensAllowed` is the set of canon tokens for this component type. */
function repairNode(node, known, cat, override) {
  if (!node || typeof node !== 'object') return null;
  const type = node.type;
  if (!known.has(type)) {
    // Unknown type → cannot render. Drop it (the THAKI gate is strict here).
    return null;
  }
  const entry = cat.get(type);
  const allowed = entry?._allowed ?? new Set();
  const propDef = loadSchema(override)["$defs"]?.[`p31Props.${type}`];
  const props = propDef?.properties ?? {};

  const out = { type };
  if (typeof node.id === 'string' && node.id) out.id = node.id;

  // Props: keep declared ones, clamp enums, drop undeclared.
  if (node.props && typeof node.props === 'object') {
    const repaired = {};
    for (const [k, v] of Object.entries(node.props)) {
      if (!(k in props)) continue; // undeclared prop → drop
      const def = props[k];
      if (def.enum && Array.isArray(def.enum) && !def.enum.includes(v)) {
        // Repair, don't just clamp: try a type coercion (e.g. "3" → 3) and
        // only clamp when the coerced value is still outside the enum.
        const coerced = coerceType(v, enumTypeHint(def));
        if (coerced !== v && def.enum.includes(coerced)) {
          repaired[k] = coerced;
        } else {
          repaired[k] = def.enum[0]; // clamp to first/declared default
        }
      } else {
        repaired[k] = v;
      }
    }
    // Missing props: fill from the declared default when one exists (required
    // OR optional). Required enum props with no default still clamp to the
    // first declared value.
    for (const [k, def] of Object.entries(props)) {
      if (!(k in repaired)) {
        if (typeof def.default !== 'undefined') repaired[k] = def.default;
        else if (def.required === true && def.enum && Array.isArray(def.enum) && def.enum.length) repaired[k] = def.enum[0];
      }
    }
    if (Object.keys(repaired).length > 0) out.props = repaired;
  }

  // Tokens: keep canon-allowed refs; before dropping a non-conforming ref try
  // a nearest-token substitution against the component's allowed set (so a
  // typo'd token is repaired, not silently destroyed). Drop only when no
  // near-match exists.
  const tokens = [];
  if (Array.isArray(node.tokens)) {
    for (const t of node.tokens) {
      if (allowed.has(t)) {
        tokens.push(t.startsWith('p31.') ? t : `p31.${t}`);
        continue;
      }
      const near = nearestToken(t, allowed);
      if (near) {
        tokens.push(near.startsWith('p31.') ? near : `p31.${near}`);
        continue;
      }
      // no near-match → the token does not exist in the namespace; drop it.
    }
  }
  if (tokens.length > 0) out.tokens = tokens;

  // Canon surface the renderer needs.
  if (entry) {
    out.importPath = entry.importPath ?? null;
    out.cssClass = entry.cssClass ?? null;
  }

  // Children (recursive).
  if (Array.isArray(node.children) && node.children.length > 0) {
    const kids = node.children.map((c) => repairNode(c, known, cat, override)).filter(Boolean);
    if (kids.length > 0) out.children = kids;
  }

  // dataBinding passes through if present.
  if (node.dataBinding != null) out.dataBinding = node.dataBinding;

  return out;
}

/** Shaper entry — repairs a candidate tree against the canon. Returns the
 *  repaired tree (or null if the root itself is unusable). */
export function shape(candidateTree, { catalog } = {}) {
  const override = catalog ? { properties: { type: { enum: catalog.components.map((c) => c.name) } }, catalog, $defs: {} } : undefined;
  const known = knownTypes(override);
  const cat = catalogByName(override);
  const root = repairNode(candidateTree, known, cat, override);
  return { tree: root, catalog: cat, repaired: root !== candidateTree };
}

/** Report which violations a raw candidate carried (for the Governor's log
 *  and the Loom training event). */
export function auditTree(candidateTree, { catalog } = {}) {
  const override = catalog ? { properties: { type: { enum: catalog.components.map((c) => c.name) } }, catalog, $defs: {} } : undefined;
  const known = knownTypes(override);
  const cat = catalogByName(override);
  const issues = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (!known.has(node.type)) { issues.push({ code: 'unknown-type', type: node.type }); return; }
    const entry = cat.get(node.type);
    const propDef = loadSchema(override)["$defs"]?.[`p31Props.${node.type}`];
    const props = propDef?.properties ?? {};
    if (node.props) {
      for (const [k, v] of Object.entries(node.props)) {
        if (!(k in props)) issues.push({ code: 'undeclared-prop', type: node.type, prop: k });
        else if (props[k].enum && !props[k].enum.includes(v)) issues.push({ code: 'enum-violation', type: node.type, prop: k, value: v });
      }
    }
    const allowed = entry?._allowed ?? new Set();
    if (node.tokens) {
      for (const t of node.tokens) {
        if (!isP31Token(t)) issues.push({ code: 'non-p31-token', token: t });
        else if (!allowed.has(t)) issues.push({ code: 'token-not-allowed', type: node.type, token: t });
      }
    }
    for (const c of node.children ?? []) walk(c);
  };
  walk(candidateTree);
  return issues;
}