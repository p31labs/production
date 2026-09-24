import { useState } from 'react'
import { registerServer, type RegisterPayload } from '@/lib/registryClient'
import type { ServerSummary } from '@/types'

const CATEGORIES = ['design', 'crypto', 'government', 'finance', 'social', 'infra'] as const

const EMPTY: RegisterPayload = {
  id: '',
  name: '',
  endpoint: '',
  category: 'infra',
  description: '',
  tags: [],
  author: '',
}

/**
 * Publish — register a community MCP server. The registry runs a live
 * liveness probe (initialize handshake + tools/list) before accepting it;
 * registered servers are marked "unverified" until P31 reviews them.
 */
export function PublishSurface() {
  const [form, setForm] = useState<RegisterPayload>(EMPTY)
  const [tagsText, setTagsText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ServerSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const set = (k: keyof RegisterPayload, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    setBusy(true)
    setResult(null)
    setError(null)
    const tags = tagsText.split(',').map((t) => t.trim()).filter(Boolean)
    const res = await registerServer({ ...form, tags })
    setBusy(false)
    if (res.error) setError(res.error)
    else if (res.server) setResult(res.server)
  }

  return (
    <div className="home-container" style={{ maxWidth: 720 }}>
      <section className="home-hero">
        <h1 className="greeting-h1">Publish a server</h1>
        <p className="landing-sub">
          Submit a public Streamable-HTTP endpoint. The registry runs a real liveness probe (initialize handshake with a supported protocol version + tools/list) before accepting it. Registered servers appear in the catalog as <strong style={{ color: 'var(--p31-accent-gold)' }}>unverified</strong> until P31 reviews them.
        </p>
      </section>

      <div className="surface-panel">
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)', marginBottom: 'var(--p31-space-3)' }}>
          <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>ID (slug) *</span>
          <input className="setup-input" value={form.id} onChange={(e) => set('id', e.target.value)} placeholder="my-cool-server" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)', marginBottom: 'var(--p31-space-3)' }}>
          <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>Name *</span>
          <input className="setup-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="My Cool Server" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)', marginBottom: 'var(--p31-space-3)' }}>
          <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>Endpoint (https://…/mcp) *</span>
          <input className="setup-input" value={form.endpoint} onChange={(e) => set('endpoint', e.target.value)} placeholder="https://example.com/mcp" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)', marginBottom: 'var(--p31-space-3)' }}>
          <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>Category *</span>
          <select className="setup-input" value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)', marginBottom: 'var(--p31-space-3)' }}>
          <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>Description *</span>
          <textarea className="setup-input" style={{ minHeight: 80, resize: 'vertical' }} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What does this server expose?" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)', marginBottom: 'var(--p31-space-3)' }}>
          <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>Tags (comma-separated)</span>
          <input className="setup-input" value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="ai, workflow, finance" />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)', marginBottom: 'var(--p31-space-3)' }}>
          <span style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-xs)' }}>Author</span>
          <input className="setup-input" value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="Your org or DID" />
        </label>

        {error && <div className="setup-err" style={{ marginBottom: 'var(--p31-space-3)' }}>{error}</div>}

        <button
          type="button"
          className="btn-sm"
          style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '10px 20px', borderRadius: 'var(--p31-radius-md)' }}
          onClick={() => void submit()}
          disabled={busy || !form.id || !form.name || !form.endpoint || !form.description}
        >
          {busy ? 'Probing endpoint…' : 'Register server'}
        </button>
      </div>

      {result && (
        <div className="surface-panel" style={{ marginTop: 'var(--p31-space-4)', borderColor: 'color-mix(in oklab, var(--p31-accent-gold) 50%, transparent)' }}>
          <div className="surface-card-title">Registered — pending review</div>
          <div className="surface-card-desc">
            {result.name} · <span className="chip" style={{ color: 'var(--p31-accent-gold)' }}>unverified</span> · {result.toolCount} tools probed · health {result.health}
          </div>
          <a href={`#/server/${encodeURIComponent(result.id)}`} style={{ color: 'var(--p31-accent)' }}>View in catalog →</a>
        </div>
      )}
    </div>
  )
}