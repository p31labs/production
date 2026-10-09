/**
 * handoff.mjs — the convergence point between the two workflows.
 *
 * Workflow A (brain.mjs) produces a publishable research report. Workflow B
 * (ui-forge) builds the artifact. The report carries a machine-readable
 * P31-HANDOFF block; the Grounder reads the BLOCK, not the prose.
 *
 *   generateHandoffBlock(meta)  → the markdown comment
 *   extractHandoffBlock(md)     → parse it back (the contract)
 *   reportToSpec(md)            → the spec forge() expects
 *   validateHandoff(block)      → the gate (complete + parseable)
 */

const HANDOFF_RE = /<!--\s*P31-HANDOFF\s*([\s\S]*?)-->/;

/** Emit the machine-readable handoff block. `meta` carries the report's
 *  contract fields. Returns the raw comment string. */
export function generateHandoffBlock(meta = {}) {
  const entities = (meta.entities ?? []).map((e) =>
    `  - name: ${e.name} fields: [${(e.fields ?? []).map((f) => `${f.name}:${f.type ?? 'string'}`).join(', ')}]`,
  ).join('\n');
  const actions = (meta.actions ?? []).map((a) => `  - name: ${a.name}`).join('\n');
  const constraints = (meta.constraints ?? []).map((c) => `  - ${c}`).join('\n');
  const gaps = (meta.gaps ?? []).map((g) => `  - ${g}`).join('\n');
  return [
    '<!-- P31-HANDOFF',
    `report_id: ${meta.reportId ?? 'p31_research_unknown'}`,
    `title: ${meta.title ?? 'Untitled'}`,
    'entities:',
    entities || '  - none',
    'actions:',
    actions || '  - none',
    'constraints:',
    constraints || '  - none',
    'gaps:',
    gaps || '  - none',
    `sources: ${meta.sources ?? 0}`,
    `confidence: ${meta.confidence ?? 0}`,
    '-->',
  ].join('\n');
}

/** Parse the block out of a report. Returns null if absent. */
export function extractHandoffBlock(md) {
  const m = String(md).match(HANDOFF_RE);
  if (!m) return null;
  return parseBlock(m[1]);
}

/** Parse the block body into a structured object. */
export function parseBlock(body) {
  const out = { entities: [], actions: [], constraints: [], gaps: [], reportId: null, title: null, sources: 0, confidence: 0 };
  let section = null;
  for (const line of body.split('\n')) {
    const s = line.trim();
    if (!s) continue;
    const kv = s.match(/^([a-z_]+):\s*(.*)$/i);
    if (kv && !s.startsWith('- ')) {
      const key = kv[1].toLowerCase();
      const val = kv[2].trim();
      if (key === 'report_id') out.reportId = val;
      else if (key === 'title') out.title = val;
      else if (key === 'sources') out.sources = parseInt(val, 10) || 0;
      else if (key === 'confidence') out.confidence = parseFloat(val) || 0;
      else if (key === 'entities') section = 'entities';
      else if (key === 'actions') section = 'actions';
      else if (key === 'constraints') section = 'constraints';
      else if (key === 'gaps') section = 'gaps';
      continue;
    }
    if (s.startsWith('- ')) {
      const item = s.slice(2).trim();
      if (section === 'entities') {
        const name = item.match(/name:\s*(\S+)/);
        if (name && name[1] !== 'none') out.entities.push({ name: name[1], fields: parseFields(item) });
      } else if (section === 'actions') {
        const name = item.match(/name:\s*(\S+)/);
        if (name && name[1] !== 'none') out.actions.push({ name: name[1] });
      } else if (section === 'constraints') {
        if (item !== 'none') out.constraints.push(item);
      } else if (section === 'gaps') {
        if (item !== 'none') out.gaps.push(item);
      }
    }
  }
  return out;
}

function parseFields(item) {
  const m = item.match(/fields:\s*\[([^\]]*)\]/);
  if (!m) return [];
  return m[1].split(',').map((f) => f.trim()).filter(Boolean).map((f) => {
    const [name, type] = f.split(':');
    return { name, type: type || 'string' };
  });
}

/** Validate the handoff contract. Returns { ok, reason? }. */
export function validateHandoff(block) {
  if (!block) return { ok: false, reason: 'no handoff block' };
  if (!block.reportId) return { ok: false, reason: 'missing report_id' };
  if (!Array.isArray(block.entities) || block.entities.length === 0) return { ok: false, reason: 'no entities' };
  for (const e of block.entities) {
    if (!e.name) return { ok: false, reason: 'entity missing name' };
    if (!Array.isArray(e.fields)) return { ok: false, reason: `entity ${e.name} missing fields` };
  }
  return { ok: true };
}

/** The bridge: report → spec that forge() consumes. */
export function reportToSpec(md) {
  const block = extractHandoffBlock(md);
  if (block) {
    return {
      title: block.title || block.reportId || 'Untitled surface',
      entities: block.entities,
      actions: block.actions,
      constraints: block.constraints,
      gaps: block.gaps,
      handoff: block,
    };
  }
  // No block → the report is the brief. Derive a minimal spec from the title.
  const title = String(md).match(/^#\s*(.+)$/m);
  return {
    title: title ? title[1].trim().slice(0, 80) : 'Untitled surface',
    entities: [],
    actions: [],
    constraints: [],
    gaps: [],
    handoff: null,
  };
}

export default { generateHandoffBlock, extractHandoffBlock, reportToSpec, validateHandoff, parseBlock };