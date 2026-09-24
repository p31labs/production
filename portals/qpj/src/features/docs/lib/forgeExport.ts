/**
 * @file forgeExport.ts — QPJ Docs → P31 Forge export.
 *
 * Serializes the active Yjs document into a P31 Forge content pack and
 * requests a themed .docx from the Forge worker. The browser never sees the
 * Forge API key: it POSTs same-origin to /api/forge/*, and the QPJ Pages
 * Function adds the X-Forge-Key header server-side.
 *
 * Forge content-pack kinds used:
 *   - kind: 'memo'   — warm hub export (default, the public front door)
 *   - kind: 'report' — scene export (dark, technical)
 *
 * The body[] uses forge typed items: para / h1 / h2 / evidence.
 */

import * as Y from 'yjs';
import { getDoc } from './docStore';

export type ForgeTheme = 'hub' | 'scene';

export interface ForgeExportOptions {
  /** Which P31 mode to style the document in. */
  theme?: ForgeTheme
  /** Override the filename (defaults to `<title>.docx`). */
  filename?: string
}

export interface ForgeExportError {
  error: string
  detail?: string
}

/**
 * Walk the prosemirror XML fragment and reduce it to forge typed items.
 *   paragraph  → { type: 'para', text }
 *   heading    → { type: 'h1' | 'h2', text } (by attrs.level)
 *   horizontalrule → skip
 */
export function serializeFragmentToForge(doc: Y.Doc): Array<{
  type: 'para' | 'h1' | 'h2'
  text: string
}> {
  const fragment = doc.getXmlFragment('prosemirror')
  const items: Array<{ type: 'para' | 'h1' | 'h2'; text: string }> = []

  for (let i = 0; i < fragment.length; i++) {
    const node = fragment.get(i)
    if (!(node instanceof Y.XmlElement)) continue
    const name = node.nodeName

    // Concatenate all text children (handles inline text + hard breaks).
    let text = ''
    for (let j = 0; j < node.length; j++) {
      const child = node.get(j)
      if (child instanceof Y.XmlText) text += child.toString()
    }
    const trimmed = text.trim()
    if (!trimmed) continue

    if (name === 'heading') {
      const level = Number(node.getAttribute('level') ?? 1)
      items.push({ type: level <= 1 ? 'h1' : 'h2', text: trimmed })
    } else {
      items.push({ type: 'para', text: trimmed })
    }
  }

  // A fully blank doc still needs at least one body item for the forge.
  if (items.length === 0) items.push({ type: 'para', text: '' })

  return items
}

/**
 * Serialize the active document into a Forge content pack.
 */
export function buildForgePack(
  docId: string,
  opts: ForgeExportOptions = {}
): { pack: Record<string, unknown>; filename: string } {
  const doc = getDoc(docId)
  const meta = doc.getMap('meta')
  const title = String(meta.get('title') ?? 'Untitled')
  const theme: ForgeTheme = opts.theme ?? 'hub'

  const body = serializeFragmentToForge(doc)
  const filename = opts.filename ?? `${title.replace(/[^\w\-. ]+/g, '').trim() || 'Untitled'}.docx`

  return {
    filename,
    pack: {
      kind: theme === 'scene' ? 'report' : 'memo',
      theme,
      title,
      date: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      filename,
      body,
    },
  }
}

/**
 * POST the pack to the QPJ-local forge proxy and download the .docx.
 * The key is injected server-side by the Pages Function.
 */
export async function forgeExportDoc(
  docId: string,
  opts: ForgeExportOptions = {}
): Promise<{ ok: true; filename: string } | ForgeExportError> {
  const { pack, filename } = buildForgePack(docId, opts)

  let res: Response
  try {
    res = await fetch('/api/forge/stylize', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(pack),
    })
  } catch (e) {
    return { error: 'network', detail: e instanceof Error ? e.message : String(e) }
  }

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.detail ?? body?.error ?? ''
    } catch {
      /* non-JSON error body */
    }
    return { error: `forge returned ${res.status}`, detail }
  }

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)

  return { ok: true, filename }
}