// P31 Forge — component renderers. One function per IR block kind.
// Emit semantic classes only (styled by report.css + booklet/layout/layout.css).
// Colors and fonts never appear here.

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function proseHtml(text) {
  return String(text ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p)}</p>`)
    .join('\n')
}

export function renderBlock(block, ctx) {
  const d = block.data ?? {}
  switch (block.kind) {
    case 'section': {
      ctx.counter = (ctx.counter ?? 0) + 1
      const n = String(ctx.counter).padStart(2, '0')
      const role = block.role ?? 'body'
      const attrs = [
        'data-unit', `data-role="${role}"`, `data-unit-id="${esc(block.id ?? block.title ?? 'u' + n)}"`,
      ]
      if (block.keepWith) attrs.push(`data-keep-with="${esc(block.keepWith)}"`)
      const kids = (block.children ?? []).map((c) => renderBlock(c, ctx)).join('\n')
      return `<section class="chapter" ${attrs.join(' ')}>
  <div class="chapter-kicker">SECTION ${n} · ${esc(block.title ?? '').toUpperCase()}</div>
  <h2>${esc(block.title ?? '')}</h2>
  <div class="body${block.columns > 1 ? ` cols-${Math.min(block.columns, 3)}` : ''}">${kids}</div>
</section>`
    }
    case 'heading': return `<h2>${esc(block.title)}</h2>`
    case 'prose': return proseHtml(block.data?.text ?? block.title ?? '')
    case 'list': {
      const items = block.data?.items ?? []
      return `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`
    }
    case 'kpi-set': {
      const items = block.data?.items ?? []
      ctx.figureCounter = (ctx.figureCounter ?? 0) + 1
      const n = ctx.figureCounter
      const label = block.data?.label ?? block.title ?? 'Metrics'
      const caption = block.data?.caption
      const strip = `<div class="metric-strip">${items
        .map((i) => `<div class="metric-tile"><div class="metric-label">${esc(i.label)}</div><div class="metric-value">${esc(i.value)}</div>${i.detail ? `<div class="metric-detail">${esc(i.detail)}</div>` : ''}</div>`)
        .join('')}</div>`
      return `<figure class="figure" id="fig-${n}">
  <figcaption class="figure-title"><span class="figure-number">Figure ${n}.</span> ${esc(label)}</figcaption>
  ${strip}
  ${caption ? `<figcaption class="figure-caption">${esc(caption)}</figcaption>` : ''}
</figure>`
    }
    case 'table': {
      const cols = block.data?.columns ?? []
      const rows = block.data?.rows ?? []
      const head = `<thead><tr>${cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`
      const body = `<tbody>${rows
        .map((r) => `<tr>${(Array.isArray(r) ? r : cols.map((c) => r?.[c] ?? '')).map((cell, i) => {
          const verdict = cols[i]?.toLowerCase() === 'verdict' ? String(cell).toUpperCase() : String(cell ?? '')
          const cls = verdict === 'VERIFIED' ? 'ok' : verdict === 'UNVERIFIED' ? 'warn' : ''
          const mono = i === 0 || cols[i]?.toLowerCase() === 'verdict'
          return `<td class="${mono ? 'mono' : ''}${cls ? ' ' + cls : ''}">${esc(String(cell ?? ''))}</td>`
        }).join('')}</tr>`)
        .join('')}</tbody>`
      return `<table class="data-table">${head}${body}</table>`
    }
    case 'callout': {
      const primary = block.data?.variant === 'primary'
      const cls = primary ? 'callout callout-primary' : 'callout'
      const label = block.data?.label ?? block.title ?? ''
      const value = block.data?.value
      const body = block.data?.body ?? ''
      return `<div class="${cls}"><div class="callout-label">${esc(label)}</div>${value ? `<div class="callout-value">${esc(value)}</div>` : ''}<p>${esc(body)}</p></div>`
    }
    case 'email': {
      const e = block.data ?? {}
      const paras = (e.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join('')
      return `<div class="email atom"><div class="email-subject">${esc(e.subject ?? '')}</div>${e.greeting ? `<p class="email-greeting">${esc(e.greeting)}</p>` : ''}${paras}${e.signoff ? `<p class="email-signoff">${esc(e.signoff)}</p>` : ''}</div>`
    }
    case 'cards': {
      const items = block.data?.items ?? []
      const variant = block.data?.variant ?? 'rec'
      if (variant === 'script') {
        // Call-script branches: a vertical list, not a grid.
        return `<div class="script-list">${items
          .map((i) => `<div class="script-item"><div class="script-title">${esc(i.title)}</div><div class="script-body">${esc(i.body)}</div></div>`)
          .join('')}</div>`
      }
      return `<ol class="card-grid">${items
        .map((i) => `<li class="rec-card"><div class="rec-num">•</div><div class="rec-body"><div class="rec-title">${esc(i.title)}</div><div class="rec-desc">${esc(i.body)}</div></div></li>`)
        .join('')}</ol>`
    }
    case 'quote': return `<blockquote class="pull-quote">${esc(block.data?.text ?? '')}</blockquote>`
    case 'steps': {
      const items = block.data?.items ?? []
      return `<ol>${items.map((i) => `<li><strong>${esc(i.title)}</strong> ${esc(i.body ?? '')}</li>`).join('')}</ol>`
    }
    case 'timeline': {
      const entries = block.data?.entries ?? []
      return `<table class="data-table"><thead><tr><th>Time</th><th>Item</th></tr></thead><tbody>${entries
        .map((e) => `<tr><td class="mono">${esc(e.time ?? '')}</td><td>${esc(e.text ?? '')}</td></tr>`)
        .join('')}</tbody></table>`
    }
    case 'signature': {
      const s = block.data ?? {}
      return `<div class="sig atom"><div class="sig-name">${esc(s.name ?? '')}</div>${s.line ? `<div class="sig-line">${esc(s.line)}</div>` : ''}</div>`
    }
    case 'figure': return `<figure class="atom">${esc(block.data?.caption ?? '')}</figure>`
    case 'methodology': return `<div class="methodology">${esc(block.data?.text ?? '')}</div>`
    case 'checklist': {
      const items = block.data?.items ?? []
      const glyph = { checked: '☑', unchecked: '☐', blocked: '⊘' }
      return `<ul class="checklist">${items
        .map((i) => `<li class="checklist-item" data-state="${esc(i.state ?? 'unchecked')}"><span class="checklist-mark">${glyph[i.state ?? 'unchecked'] ?? '☐'}</span><span class="checklist-text">${esc(i.text ?? '')}</span></li>`)
        .join('')}</ul>`
    }
    case 'toc': {
      // Honest TOC: a contents list of section titles. Page numbers are
      // omitted — Chromium does not support target-counter() in body content,
      // and a broken TOC is worse than a pageless one.
      const titles = ctx.titles ?? []
      return `<nav class="toc"><div class="toc-title">${esc(block.data?.title ?? 'Contents')}</div><ol class="toc-list">${titles
        .map((t) => `<li class="toc-item">${esc(t)}</li>`)
        .join('')}</ol></nav>`
    }
    case 'pagebreak': return `<div class="pagebreak" style="break-before: page"></div>`
    default: return `<!-- unhandled block kind: ${esc(block.kind)} -->`
  }
}

export { esc, proseHtml }