/**
 * grounder.mjs — the first tetrahedral vertex.
 *
 * GROUNDER: hold what's real — fact vs. assumption vs. gap. Never fills a
 * gap with inference.
 *
 * Takes an arbitrary backend spec (entities, fields, relationships, actions)
 * and reduces it to:
 *   facts     — verified: entities, fields, relations, actions
 *   gaps      — unverified: a field with no clear display, an action with no
 *               trigger, a navigation surface not specified
 *   questions — the Socratic gap-ask: ONE question per gap, ranked by
 *               information gain − λ·cost (λ high for neurodivergent load).
 *               The operator answers only the top-K; never a wall of prompts.
 *
 * This is the input parser the plan called "Grounder" — it separates what is
 * verified from what is assumed from what is missing. It never hallucinates
 * a field that the spec did not declare.
 */

const LAMBDA = 0.6; // neurodivergent load penalty: questions must earn their cost

/** A verified fact. `kind` mirrors the source document. */
export function parseBackendSpec(spec) {
  const facts = [];
  const gaps = [];
  const entities = Array.isArray(spec?.entities) ? spec.entities : [];
  const actions = Array.isArray(spec?.actions) ? spec.actions : [];

  for (const e of entities) {
    const name = e.name ?? e.id ?? e.title;
    if (!name) {
      gaps.push({ kind: 'entity-unnamed', detail: 'an entity has no name/id' });
      continue;
    }
    facts.push({ kind: 'entity', name, title: e.title ?? name });
    const fields = Array.isArray(e.fields) ? e.fields : [];
    for (const f of fields) {
      const fname = f.name;
      if (!fname) continue;
      const type = typeof f.type === 'string' ? f.type : 'unknown';
      const display = f.display ?? inferDisplay(type, fname);
      facts.push({ kind: 'field', entity: name, name: fname, type, display });
      if (display === 'unknown') {
        gaps.push({ kind: 'field-display', entity: name, field: fname, detail: `field "${fname}" (${type}) has no clear display` });
      }
    }
    if (Array.isArray(e.relations)) {
      for (const rel of e.relations) {
        if (rel.target) facts.push({ kind: 'relation', entity: name, target: rel.target, via: rel.via ?? 'id' });
      }
    }
  }

  for (const a of actions) {
    const name = a.name ?? a.id ?? (typeof a === 'string' ? a : null);
    if (!name) {
      gaps.push({ kind: 'action-unnamed', detail: 'an action has no name' });
      continue;
    }
    facts.push({ kind: 'action', name, trigger: a.trigger ?? 'button' });
    if (!a.trigger && !a.label) {
      gaps.push({ kind: 'action-trigger', action: name, detail: `action "${name}" has no trigger/label` });
    }
  }

  if (entities.length === 0 && actions.length === 0) {
    gaps.push({ kind: 'empty-spec', detail: 'spec declares no entities and no actions' });
  }

  return { facts, gaps, entities, actions };
}

/** Best-effort display inference from a type/name. Never marks a real type
 *  unknown unless it has no obvious mapping. */
function inferDisplay(type, name) {
  switch (String(type).toLowerCase()) {
    case 'string':
    case 'text': return 'text';
    case 'number':
    case 'int':
    case 'float': return 'metric';
    case 'boolean': return 'toggle';
    case 'date':
    case 'datetime': return 'date';
    case 'enum': return 'badge';
    case 'json':
    case 'object': return 'card';
    default:
      // Fall back to name heuristics only for clearly-mapped cases.
      const n = String(name).toLowerCase();
      if (n.includes('url') || n.includes('link') || n.includes('href')) return 'link';
      if (n.includes('icon')) return 'icon';
      if (n.includes('avatar') || n.includes('photo') || n.includes('image')) return 'image';
      if (n.includes('count') || n.includes('total') || n.includes('score')) return 'metric';
      if (n.includes('status') || n.includes('state')) return 'badge';
      return 'unknown';
  }
}

/** Information gain of asking about a gap: how much of the surface it
 *  resolves (0..1) minus λ·cost (how many fields/questions it implicates). */
function gain(gap) {
  const base = gap.kind === 'field-display' ? 0.8 : gap.kind === 'action-trigger' ? 0.7 : gap.kind === 'empty-spec' ? 1.0 : 0.5;
  return base;
}

function cost(gap) {
  return gap.kind === 'field-display' ? 1 : gap.kind === 'action-trigger' ? 1 : gap.kind === 'empty-spec' ? 2 : 1;
}

function score(gap) {
  return gain(gap) - LAMBDA * cost(gap);
}

/** The Socratic ask: rank gaps by information gain − λ·cost, emit ONE
 *  question per gap (top-K only). λ is the neurodivergent load penalty. */
export function socraticQuestions(gaps, topK = 3) {
  const ranked = [...gaps]
    .map((g) => ({ ...g, _score: score(g) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, topK);
  return ranked.map((g) => {
    switch (g.kind) {
      case 'field-display':
        return { gap: g, question: `How should "${g.field}" (${g.entity}) be shown — as a number, a badge, a card, or something else?` };
      case 'action-trigger':
        return { gap: g, question: `What should trigger "${g.action}" — a button, a menu item, or a keyboard shortcut?` };
      case 'empty-spec':
        return { gap: g, question: 'This spec has no entities or actions. What is the screen for?' };
      default:
        return { gap: g, question: `Missing: ${g.detail}` };
    }
  });
}

/** The grounded context handed to the Dreamer — only verified facts plus the
 *  unresolved gaps (as explicit "do not assume" list). */
export function ground(spec, { askTopK = 0 } = {}) {
  const { facts, gaps, entities, actions } = parseBackendSpec(spec);
  const questions = askTopK > 0 ? socraticQuestions(gaps, askTopK) : [];
  return {
    facts,
    gaps,
    questions,
    entities,
    actions,
    verified: facts,
    unresolved: gaps,
  };
}