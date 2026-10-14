// index.js — P31 Forge Render Worker. The production path for workspace
// document generation: IR → template → theme → HTML → (Browser Run PDF |
// DOCX). Auth is enforced by Cloudflare Access (service token) in front of
// this Worker; the workspace Pages Function holds the token.
//
//   GET  /health          → { status, version }
//   POST /render          → body: Document IR JSON  → application/pdf
//   POST /render/docx     → body: Document IR JSON  → docx (vnd.openxmlformats)
//   POST /render/html     → body: Document IR JSON  → text/html (debug)
//
// Theme resolution: IR.theme > body.theme > template.defaultTheme.
// Browser Run: free plan is a trial tier (10 min/day); production needs the
// Workers Paid plan (10 browser-hours/month included) — this worker's
// keep_alive is widened so pooled instances serve back-to-back renders.
import { validate } from './validate.js'
import { resolveTemplate, buildHtml } from './template.js'
import { irToDocx } from './docx-render.js'

const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json' },
})

// ── R2 presigned GET (AWS SigV4, zero deps — workerd + node) ──
const enc = new TextEncoder()
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('')
async function hmac(key, msg) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return crypto.subtle.sign('HMAC', k, enc.encode(msg))
}
async function sha256hex(msg) {
  return hex(await crypto.subtle.digest('SHA-256', enc.encode(msg)))
}

async function presignGet({ accessKeyId, secretAccessKey, accountId, bucket, key, ttlSeconds = 900 }) {
  const host = `${bucket}.${accountId}.r2.cloudflarestorage.com`
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
  const scope = `${amzDate.slice(0, 8)}/auto/s3/aws4_request`
  const payload = 'UNSIGNED-PAYLOAD'
  const canonical = ['GET', `/${key}`, '', `host:${host}`, `x-amz-content-sha256:${payload}`, `x-amz-date:${amzDate}`, '', 'host;x-amz-content-sha256;x-amz-date', payload].join('\n')
  const sts = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256hex(canonical)].join('\n')
  const kDate = await hmac('AWS4' + secretAccessKey, amzDate.slice(0, 8))
  const kRegion = await hmac(kDate, 'auto')
  const kService = await hmac(kRegion, 's3')
  const kSigning = await hmac(kService, 'aws4_request')
  const signature = hex(await hmac(kSigning, sts))
  return `https://${host}/${key}?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${scope}`)}&X-Amz-Date=${amzDate}&X-Amz-Expires=${ttlSeconds}&X-Amz-SignedHeaders=host&X-Amz-Signature=${signature}`
}

async function deliver(env, bytes, ir, contentType) {
  const filename = (ir.meta?.title ?? 'document').replace(/[^\w\-. ]+/g, '').trim() || 'document'
  // R2 path: PUT the artifact, hand back a short-TTL presigned URL. Falls
  // back to direct streaming when the bindings are absent (dev).
  if (env.ARTIFACTS && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_ACCOUNT_ID && env.R2_BUCKET) {
    const key = `renders/${crypto.randomUUID()}.${contentType.includes('pdf') ? 'pdf' : 'docx'}`
    await env.ARTIFACTS.put(key, bytes, { httpMetadata: { contentType } })
    const url = await presignGet({ accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY, accountId: env.R2_ACCOUNT_ID, bucket: env.R2_BUCKET, key })
    return json({ url, key, bytes: bytes.byteLength, filename })
  }
  return new Response(bytes, {
    headers: {
      'content-type': contentType,
      'content-disposition': `attachment; filename="${filename}.${contentType.includes('pdf') ? 'pdf' : 'docx'}"`,
    },
  })
}

function resolveTheme(ir, tpl) {
  const allowed = tpl.themes ?? [tpl.defaultTheme ?? 'ats']
  let theme = ir.theme ?? tpl.defaultTheme ?? 'ats'
  if (allowed.length && !allowed.includes(theme)) theme = tpl.defaultTheme
  return theme
}

async function renderPdf(env, ir, tpl, theme) {
  // Browser Sessions give full control (viewport, waits, page.pdf options) —
  // the same Chromium fidelity as the local pipeline.
  const { launch } = await import('@cloudflare/playwright')
  const browser = await launch(env.BROWSER, { keep_alive: 600_000 })
  try {
    const page = await browser.newPage({
      viewport: { width: Math.round(tpl.page.widthIn * 96), height: Math.round(tpl.page.heightIn * 96) },
    })
    const html = buildHtml(ir, tpl, theme)
    await page.setContent(html, { waitUntil: 'networkidle0' })
    return await page.pdf({
      width: `${tpl.page.widthIn}in`,
      height: `${tpl.page.heightIn}in`,
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: '0', bottom: '0', left: '0', right: '0' }, // @page CSS owns margins
    })
  } finally {
    await browser.close() // mandatory: pooled instances consume quota otherwise
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname.replace(/\/+$/, '')

    if (path === '/health' || path === '/') {
      return json({ status: 'ok', version: '1.0.0', endpoints: ['/render', '/render/docx', '/render/html'] })
    }

    if (!['/render', '/render/docx', '/render/html'].includes(path)) {
      return json({ error: 'not found' }, 404)
    }
    if (request.method !== 'POST') return json({ error: 'POST required' }, 405)

    let ir
    try { ir = await request.json() } catch { return json({ error: 'invalid JSON body' }, 400) }
    const v = validate(ir)
    if (!v.ok) return json({ errors: v.errors }, 400)

    let tpl
    try { ({ template: tpl } = resolveTemplate(ir)) } catch (e) { return json({ error: e.message }, 400) }
    const theme = resolveTheme(ir, tpl)

    try {
      if (path === '/render/docx') {
        const bytes = await irToDocx(ir, theme)
        return await deliver(env, bytes, ir, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      }
      if (path === '/render/html') {
        return new Response(buildHtml(ir, tpl, theme), { headers: { 'content-type': 'text/html' } })
      }
      const pdf = await renderPdf(env, ir, tpl, theme)
      return await deliver(env, pdf, ir, 'application/pdf')
    } catch (e) {
      return json({ error: `render failed: ${e.message}` }, 500)
    }
  },
}