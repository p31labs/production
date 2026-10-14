// P31 Forge — lightweight IR validator. No new deps: manual checks mirroring
// schema/document-ir.schema.json. Returns { ok, errors }.
const TYPES = ['report', 'brief', 'letter', 'memo', 'deck', 'grant', 'table-report', 'agenda', 'digest', 'credential', 'packet', 'runbook', 'guide', 'family-letter']
const KINDS = ['section', 'heading', 'prose', 'list', 'kpi-set', 'table', 'callout', 'email', 'cards', 'quote', 'steps', 'timeline', 'signature', 'figure', 'methodology', 'checklist', 'toc', 'pagebreak']
const ROLES = ['summary', 'body', 'support', 'appendix', 'colophon']

export function validate(ir) {
  const errors = []
  if (!ir || typeof ir !== 'object') return { ok: false, errors: ['IR is not an object'] }
  if (!TYPES.includes(ir.type)) errors.push(`type "${ir.type}" not in registry`)
  if (!ir.meta || typeof ir.meta.title !== 'string' || !ir.meta.title.trim()) errors.push('meta.title required')
  if (!Array.isArray(ir.blocks)) errors.push('blocks must be an array')

  const walk = (b, path) => {
    if (!KINDS.includes(b.kind)) errors.push(`${path}: unknown kind "${b.kind}"`)
    if (b.role && !ROLES.includes(b.role)) errors.push(`${path}: unknown role "${b.role}"`)
    if (b.columns != null && (b.columns < 1 || b.columns > 3)) errors.push(`${path}: columns out of range`)
    if (Array.isArray(b.children)) b.children.forEach((c, i) => walk(c, `${path}.children[${i}]`))
  }
  ;(ir.blocks ?? []).forEach((b, i) => walk(b, `blocks[${i}]`))
  if (ir.children != null && !Array.isArray(ir.children)) errors.push('children must be an array')
  else (ir.children ?? []).forEach((c, i) => { if (!c.type) errors.push(`children[${i}]: missing type`) })
  return { ok: errors.length === 0, errors }
}

export default validate