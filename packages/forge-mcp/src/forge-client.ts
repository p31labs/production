/**
 * HTTP client for the P31 Forge worker.
 *
 * The Forge is the document-rendering transducer: typed content pack in,
 * themed .docx out. Base URL is configurable via FORGE_BASE_URL (default:
 * the live worker). The API key is optional today (the forge fails open)
 * but the header is always sent when present, so hardening the forge is a
 * no-op for clients.
 */
import type { ForgeBrand, ForgePack } from './types.js'

const DEFAULT_BASE = 'https://p31-forge.trimtab-signal.workers.dev'

export class ForgeClient {
  private base: string
  private key: string | undefined

  constructor(opts: { baseUrl?: string; apiKey?: string } = {}) {
    this.base = (opts.baseUrl ?? process.env.FORGE_BASE_URL ?? DEFAULT_BASE).replace(/\/$/, '')
    this.key = opts.apiKey ?? process.env.FORGE_API_KEY
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    const h: Record<string, string> = { ...extra }
    if (this.key) h['X-Forge-Key'] = this.key
    return h
  }

  /** GET /brand — the two-mode token set. */
  async brand(): Promise<ForgeBrand> {
    const res = await fetch(`${this.base}/brand`, { headers: this.headers() })
    if (!res.ok) throw new Error(`forge /brand ${res.status}`)
    return (await res.json()) as ForgeBrand
  }

  /** GET /health — liveness. */
  async health(): Promise<{ status: string; version?: string }> {
    const res = await fetch(`${this.base}/health`, { headers: this.headers() })
    if (!res.ok) throw new Error(`forge /health ${res.status}`)
    return (await res.json()) as { status: string; version?: string }
  }

  /**
   * POST /stylize — the REFORMAT route. Accepts a content pack + theme,
   * returns a themed .docx.
   */
  async stylize(pack: ForgePack): Promise<{ bytes: Uint8Array; filename: string }> {
    const filename = pack.filename ?? `${slug(pack.title)}.docx`
    const res = await fetch(`${this.base}/stylize`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ ...pack, filename }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`forge /stylize ${res.status}: ${detail.slice(0, 200)}`)
    }
    const buf = new Uint8Array(await res.arrayBuffer())
    return { bytes: buf, filename }
  }

  /** POST /compile — the base route (no theme override). */
  async compile(pack: ForgePack): Promise<{ bytes: Uint8Array; filename: string }> {
    const filename = pack.filename ?? `${slug(pack.title)}.docx`
    const res = await fetch(`${this.base}/compile`, {
      method: 'POST',
      headers: this.headers({ 'content-type': 'application/json' }),
      body: JSON.stringify({ ...pack, filename }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`forge /compile ${res.status}: ${detail.slice(0, 200)}`)
    }
    const buf = new Uint8Array(await res.arrayBuffer())
    return { bytes: buf, filename }
  }
}

function slug(s: string): string {
  return s.replace(/[^\w\-. ]+/g, '').trim().replace(/\s+/g, '_') || 'Untitled'
}