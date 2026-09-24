import type { ForgeRequest } from '@/types'

/**
 * Forge client — talks to the P31 Forge via the same-origin /api/forge proxy.
 * The proxy lives in functions/api/forge/[[path]].ts and forwards to
 * p31-forge.trimtab-signal.workers.dev (or FORGE_ORIGIN).
 */

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