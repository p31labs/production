import type { ForgeRequest } from '@/types'
import type { DocumentIR } from '@/types/ir'

/**
 * Forge client — talks to the P31 Forge via the same-origin /api/forge proxy.
 * The proxy lives in functions/api/forge/[[path]].ts and forwards to
 * p31-forge.trimtab-signal.workers.dev (or FORGE_ORIGIN).
 *
 * Modern path (Document IR): forgeRender / forgeRenderDocx post the IR to
 * /render and /render/docx on the render worker; the worker returns the
 * artifact bytes directly (PDF via Cloudflare Browser Run; DOCX via the
 * pure-JS docx pipeline).
 */

export interface RenderOptions {
  format: 'pdf' | 'docx'
  theme?: string
}

export async function forgeRender(
  ir: DocumentIR,
  opts: RenderOptions = { format: 'pdf' },
  signal?: AbortSignal,
): Promise<{ bytes: ArrayBuffer; filename: string }> {
  const ext = opts.format === 'docx' ? 'docx' : 'pdf'
  const filename = `${(ir.meta.title ?? 'document').replace(/[^\w\-. ]+/g, '').trim() || 'document'}.${ext}`
  const body = { ...ir, theme: opts.theme ?? ir.theme }
  const res = await fetch(`/api/forge/render${opts.format === 'docx' ? '/docx' : ''}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Forge render failed (${res.status}): ${text.slice(0, 300)}`)
  }
  const contentType = res.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const data = (await res.json()) as { url?: string; filename?: string; error?: string }
    if (data.url) {
      // R2 path: fetch the short-TTL presigned artifact.
      const artifact = await fetch(data.url, { signal })
      if (!artifact.ok) throw new Error(`artifact fetch failed (${artifact.status})`)
      return { bytes: await artifact.arrayBuffer(), filename: data.filename ?? filename }
    }
    throw new Error(data.error ?? 'render returned JSON without an artifact URL')
  }
  return { bytes: await res.arrayBuffer(), filename }
}

/** Trigger a browser download of the rendered artifact. */
export function downloadArtifact({ bytes, filename }: { bytes: ArrayBuffer; filename: string }): void {
  const blob = new Blob([bytes])
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function forgeStylize(
  req: ForgeRequest,
  signal?: AbortSignal,
): Promise<{ bytes: ArrayBuffer; filename: string }> {
  const filename = `${req.title.replace(/[^\w\-. ]+/g, '').trim() || 'Untitled'}.docx`
  const res = await fetch('/api/forge/stylize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...req, filename }),
    signal,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Forge stylize failed (${res.status}): ${text.slice(0, 200)}`)
  }
  return { bytes: await res.arrayBuffer(), filename }
}

export async function forgeHealth(signal?: AbortSignal): Promise<{ status: string; version?: string }> {
  const res = await fetch('/api/forge/health', { signal })
  if (!res.ok) throw new Error(`Forge health failed (${res.status})`)
  return res.json()
}