// P31 Forge — convergence markdown → Document IR adapter.
// The markdown producer becomes one IR producer among many. The override
// (booklet/layout/sessions/<session>.layout.json) drives section actions:
// drop-if-duplicate, move-into, columns, keepWith, render hints.
import { readFileSync } from 'node:fs'

const esc = (s) => String(s ?? '')

function splitSections(md) {
  const out = {}
  let last = null
  for (const line of String(md).split('\n')) {
    const m = line.match(/^##\s+(.+)$/)
    if (m) { last = m[1].trim(); out[last] = [] } else if (last) out[last].push(line)
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join('\n').trim()]))
}

function jaccard(a, b) {
  const tok = (s) => new Set(esc(s).toLowerCase().replace(/[^\w\s$€]/g, ' ').split(/\s+/).filter((t) => t.length > 1))
  const A = tok(a), B = tok(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

function firstSentence(text) {
  const m = esc(text).match(/^.*?[.!?](?:\s|$)/)
  return m ? m[0].trim() : esc(text).slice(0, 200)
}

const boldLabelRe = (md) => new RegExp(md)

export function parseBoldBullets(body) {
  // "- **Label** — text" (no colon) → {label, text}
  const items = []
  for (const line of esc(body).split('\n')) {
    let m = line.match(/^\s*-\s*\*\*(.+?)\*\*\s*—\s*(.+)$/)
    if (m) { items.push({ label: m[1].trim(), text: m[2].trim() }); continue }
    m = line.match(/^\s*-\s*\*\*(.+?)\*\*\s*:\s*(.+)$/)
    if (m) items.push({ label: m[1].trim(), text: m[2].trim() })
  }
  return items
}

export function parseKpiBullets(body) {
  const items = []
  for (const line of esc(body).split('\n')) {
    const m = line.match(/^\s*-\s*\*\*(.+?)\*\*\s*:\s*([^(]+?)\s*\(([^)]+)\)\s*$/)
    if (m) items.push({ label: m[1].trim(), value: m[2].trim(), detail: m[3].trim() })
  }
  return items
}

export function parsePipeTable(body) {
  const rows = esc(body).split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|') && l.endsWith('|'))
  const cells = rows.map((r) => r.slice(1, -1).split('|').map((c) => c.trim()))
  if (cells.length < 2) return null
  const columns = cells[0]
  const dataRows = cells.slice(2).map((r) => r.map((c) => c)) // skip separator row
  return { columns, rows: dataRows }
}

export function parseScriptCards(body) {
  const items = []
  for (const line of esc(body).split('\n')) {
    const m = line.match(/^\s*-\s*\*\*(.+?)\.\*\*\s*(.+)$/)
    if (m) items.push({ title: m[1].trim(), body: m[2].trim() })
  }
  return items
}

export function parseRecItems(body) {
  const items = []
  for (const line of esc(body).split('\n')) {
    const m = line.match(/^\s*\d+\.\s*\*\*(.+?)\*\*\s*:\s*(.+)$/)
    if (m) items.push({ title: m[1].trim(), body: m[2].trim() })
  }
  return items
}

export function parseCallouts(body) {
  // paragraphs that start with **Label:** or **$N needed.**
  const callouts = []
  const paras = []
  for (const p of esc(body).split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)) {
    const ask = p.match(/^\*\*(\$[\d,]+)\s*needed\.\*\*\s*(.+)$/)
    if (ask) {
      callouts.push({ kind: 'callout', data: { variant: 'primary', label: 'The Ask', value: `${ask[1]} needed`, body: ask[2] } })
      continue
    }
    const label = p.match(/^\*\*(.+?)\*\*\s*:\s*(.+)$/)
    if (label) {
      callouts.push({ kind: 'callout', data: { label: label[1].trim(), body: label[2].trim() } })
      continue
    }
    paras.push(p)
  }
  return { callouts, paras }
}

export function parseEmail(body) {
  const text = esc(body).replace(/^>+\s*/gm, '').replace(/\n+/g, ' ').trim()
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/)
  const subject = sentences[0] ?? ''
  const greeting = sentences.find((s) => /^Hi\b|^Dear\b|^Hello\b/.test(s)) ?? ''
  const signoff = sentences.find((s) => /^Best\b|^Sincerely\b|^Thanks\b|^Regards\b/.test(s)) ?? ''
  const paragraphs = sentences.filter((s) => s !== subject && s !== greeting && s !== signoff)
  return { subject, greeting, signoff, paragraphs }
}

function titleFromConsensus(consensusBody) {
  const m = esc(consensusBody).match(/^\s*-\s*\*\*([^*]+)\*\*/)
  return m ? m[1].trim() : 'P31 Document'
}

export function convergenceToIR({ md, claims = [], session = '', override = {}, date } = {}) {
  const sections = splitSections(md)
  const secCfg = override.sections ?? {}
  const summaryText = sections['Summary'] ?? ''
  const consensus = sections['Consensus'] ?? ''
  const findings = parseBoldBullets(consensus)
  const takeaway = summaryText.trim()

  const ir = {
    type: override.extends ?? 'report',
    theme: null,
    meta: {
      title: titleFromConsensus(consensus),
      kicker: 'P31 Labs · Sovereign Research',
      thesis: firstSentence(takeaway),
      session,
      date: date ?? new Date().toISOString().slice(0, 10),
      source: 'convergence',
    },
    exec: { takeaway, keyFindings: findings.map((f) => `${f.label}: ${f.text}`) },
    blocks: [],
  }

  const cfg = (name) => secCfg[String(name).toLowerCase()] ?? {}
  const isDup = (name, text, against) => {
    const c = cfg(name)
    if (c.action === 'drop-if-duplicate' && (c.threshold ?? override.dedupeThreshold ?? 0.85) <= jaccard(text, against)) return true
    return false
  }

  // Summary — usually dropped as duplicate of exec.takeaway
  if (summaryText && !isDup('summary', takeaway, ir.exec.takeaway)) {
    ir.blocks.push({ kind: 'section', id: 'summary', title: 'Summary', role: 'summary', children: [{ kind: 'prose', data: { text: takeaway } }] })
  }

  // Consensus — usually dropped as duplicate of exec.keyFindings (compare
  // bare finding text against the same bare text; the exec copy is identical)
  if (consensus && !isDup('consensus', findings.map((f) => f.text).join(' '), findings.map((f) => f.text).join(' '))) {
    ir.blocks.push({
      kind: 'section', id: 'consensus', title: 'Consensus', role: 'summary',
      children: [{ kind: 'list', data: { items: findings.map((f) => `${f.label}: ${f.text}`) } }],
    })
  }

  // Bridge Metrics → KPI set, moved into the exec page by the renderer.
  // Carries a figure label, intro link, interpretive caption, and source —
  // visuals are always labeled and tied to page content.
  const bm = sections['Bridge Metrics']
  if (bm) {
    const c = cfg('bridge metrics')
    ir.blocks.push({
      kind: 'section', id: 'bridge-metrics', title: 'Bridge Metrics', role: 'summary',
      moveTo: c.action === 'move-into' ? c.target : null,
      children: [{
        kind: 'kpi-set',
        data: {
          label: 'Bridge Funding at a Glance',
          caption: 'The $27,000 bridge equals the NLnet Restack request — the nearest-term decision point. Filed applications total approximately $102,000.',
          items: parseKpiBullets(bm),
        },
      }],
    })
  }

  // Body sections
  for (const [name, body] of Object.entries(sections)) {
    const key = String(name).toLowerCase()
    const c = cfg(name)
    if (['summary', 'consensus', 'bridge metrics'].includes(key)) continue
    let block
    if (key === 'synthesis') {
      block = { kind: 'section', id: 'synthesis', title: name, role: 'body', columns: c.columns ?? 1, children: [{ kind: 'prose', data: { text: body } }] }
    } else if (key === 'call script') {
      block = { kind: 'section', id: 'call-script', title: name, role: 'body', columns: c.columns ?? 1, children: [{ kind: 'cards', data: { variant: 'script', items: parseScriptCards(body) } }] }
    } else if (key === 'referral targets') {
      const t = parsePipeTable(body)
      block = t ? { kind: 'section', id: 'referral-targets', title: name, role: 'body', keepWith: c.keepWith, children: [{ kind: 'table', data: t }] } : null
    } else if (key === 'bridge funding memo') {
      const { callouts, paras } = parseCallouts(body)
      block = { kind: 'section', id: 'bridge-funding-memo', title: name, role: 'body', keepWith: c.keepWith, children: [...paras.map((p) => ({ kind: 'prose', data: { text: p } })), ...callouts] }
    } else if (key === 'follow-up email') {
      block = { kind: 'section', id: 'follow-up-email', title: name, role: 'support', children: [{ kind: 'email', data: parseEmail(body) }] }
    } else if (key === 'next actions') {
      block = { kind: 'section', id: 'next-actions', title: name, role: 'support', keepWith: c.keepWith, children: [{ kind: 'cards', data: { variant: 'rec', items: parseRecItems(body) } }] }
    } else {
      block = { kind: 'section', id: key.replace(/\s+/g, '-'), title: name, role: 'body', children: [{ kind: 'prose', data: { text: body } }] }
    }
    if (block) ir.blocks.push(block)
  }

  // Evidence appendix + methodology (from verified claims, not markdown).
  // The methodology note is a CHILD of the appendix so it flows onto the same
  // page as the table's last rows — never orphaned alone.
  if (Array.isArray(claims) && claims.length) {
    ir.blocks.push({
      kind: 'section', id: 'evidence-appendix', title: 'Evidence Appendix', role: 'appendix', forceBreakBefore: true,
      children: [{
        kind: 'table',
        data: {
          columns: ['ID', 'Claim', 'Source', 'Verdict'],
          rows: claims.map((c) => [c.ledgerId ?? '', esc(c.sentence).slice(0, 120), (c.sources ?? []).join(', '), c.verdict ?? '']),
        },
      }, {
        kind: 'methodology',
        data: { text: `jitterbug research (${claims.length} claims extracted by deterministic AST parser). Attribution: internal facet labels are synthesis prose; only external standards/works become evidence rows. Verification: claims checked against VERIFIED_FACTS.md + CITATION_LEDGER.md. Unverified = named source not in P31 grounding ledgers.` },
      }],
    })
  }

  return ir
}

export function loadClaims(path) {
  try {
    const j = JSON.parse(readFileSync(path, 'utf8'))
    return Array.isArray(j.claims) ? j.claims : []
  } catch { return [] }
}

export { splitSections, jaccard }