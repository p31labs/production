/**
 * @file forgeClient.ts — QPJ-side client for the P31 Forge (document generation).
 *
 * POSTs content packs same-origin to /api/forge/*; the QPJ Pages Function
 * injects the Forge API key server-side, so the key never reaches the browser.
 * Used by the Drive surface ("generate a document to Drive") and the Docs
 * surface ("Export · Forge").
 */

export type ForgeTheme = 'hub' | 'scene'

export interface ForgeBodyItem {
  type: 'para' | 'h1' | 'h2' | 'bullet' | 'evidence' | 'timeline'
  text?: string
  claim?: string
  value?: string
  source?: string
  verified?: string
  entries?: Array<{ date: string; event: string }>
}

export interface ForgePack {
  kind: 'memo' | 'report' | 'letter' | 'grant'
  theme: ForgeTheme
  title: string
  date?: string
  filename?: string
  body: ForgeBodyItem[]
}

export async function forgeStylize(pack: ForgePack): Promise<{ bytes: ArrayBuffer; filename: string }> {
  const filename = pack.filename ?? `${pack.title.replace(/[^\w\-. ]+/g, '').trim() || 'Untitled'}.docx`
  const res = await fetch('/api/forge/stylize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...pack, filename }),
  })
  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.detail ?? body?.error ?? ''
    } catch {
      /* non-JSON error body */
    }
    throw new Error(`forge returned ${res.status}${detail ? ` — ${detail}` : ''}`)
  }
  return { bytes: await res.arrayBuffer(), filename }
}