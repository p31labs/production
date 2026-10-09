import { useCallback, useEffect, useState } from 'react'
import { MCP_TOOLS } from '@/lib/mcpTools'

const API = 'https://forum-api.trimtab-signal.workers.dev'

interface LifeEvent {
  id: string
  kind: string
  title: string
  body: string
  author_did: string
  tags: string
  visibility: string
  week_start: string | null
  created_at: number
}

const KINDS = ['conversation', 'health', 'reflection', 'goal', 'note'] as const
const VISIBILITY = ['private', 'family', 'public'] as const

function short(did: string): string {
  return did.length > 18 ? `${did.slice(0, 18)}…` : did
}

/**
 * LifeSurface — the "my life" layer, a sibling of ForumSurface.
 *
 * Plain-text vault + weekly dashboard + relationship/health log, all in one
 * surface, backed by the forum's D1 (one database, one Loom audit trail).
 * No real names — author_did is a did:key pickle. Register-1 surface: speaks
 * as the system, honest states only.
 */
export function LifeSurface() {
  const [events, setEvents] = useState<LifeEvent[]>([])
  const [filter, setFilter] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/life`)
      const d = await r.json()
      setEvents(d.events ?? [])
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const visible = filter ? events.filter((e) => e.kind === filter) : events

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.life} aria-label="Life surface">
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-toolbar" style={{ borderBottom: '1px solid var(--p31-glass-border)', padding: 'var(--p31-space-2)' }}>
            <NewLifeEntry onCreated={load} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--p31-cloud)', fontWeight: 600, padding: 'var(--p31-space-3)' }}>
            KINDS
          </div>
          <button type="button" className="docs-item" style={{ width: '100%' }} onClick={() => setFilter(null)}>
            All
          </button>
          {KINDS.map((k) => (
            <button key={k} type="button" className="docs-item" style={{ width: '100%' }} onClick={() => setFilter(k === filter ? null : k)}>
              {k}
            </button>
          ))}
          {error && <p style={{ fontSize: 12, color: 'var(--p31-accent-red)', padding: 'var(--p31-space-3)' }}>{error}</p>}
        </aside>

        <div className="docs-main" style={{ padding: 'var(--p31-space-5)' }}>
          <h2 className="control-surface__title" style={{ fontSize: 'var(--p31-text-h3)' }}>Life log</h2>
          <p style={{ color: 'var(--p31-cloud)', fontSize: 'var(--p31-text-sm)' }}>
            {filter ? `Filtered to ${filter}` : 'Every event here is a governed record — the same audit trail as the forum.'}
          </p>
          <div style={{ marginTop: 'var(--p31-space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
            {visible.map((e) => (
              <article key={e.id} style={{
                background: 'var(--p31-surface)',
                borderRadius: 'var(--p31-radius-sm)',
                padding: 'var(--p31-space-4)',
                border: '1px solid var(--p31-glass-border)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--p31-space-3)' }}>
                  <span style={{ fontWeight: 600 }}>{e.title}</span>
                  <span style={{ fontSize: 11, color: 'var(--p31-accent)', textTransform: 'uppercase' }}>{e.kind}</span>
                </div>
                {e.body && <p style={{ marginTop: 'var(--p31-space-2)' }}>{e.body}</p>}
                <footer style={{ fontSize: 12, color: 'var(--p31-cloud)', marginTop: 'var(--p31-space-2)' }}>
                  {short(e.author_did)} · {new Date(e.created_at).toLocaleDateString()}
                  {e.visibility !== 'private' ? ` · ${e.visibility}` : ''}
                  {e.week_start ? ` · week of ${e.week_start}` : ''}
                </footer>
              </article>
            ))}
            {visible.length === 0 && <p style={{ color: 'var(--p31-cloud)' }}>Nothing logged yet.</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

function NewLifeEntry({ onCreated }: { onCreated: () => void }) {
  const [kind, setKind] = useState<typeof KINDS[number]>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<typeof VISIBILITY[number]>('private')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function create() {
    if (!title.trim()) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch(`${API}/life`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, title, body, visibility }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(String(d?.error ?? 'failed')); return }
      setTitle(''); setBody(''); onCreated()
    } finally { setBusy(false) }
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--p31-space-2)' }}>
      <select className="setup-input" value={kind} onChange={(e) => setKind(e.target.value as typeof KINDS[number])}>
        {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <select className="setup-input" value={visibility} onChange={(e) => setVisibility(e.target.value as typeof VISIBILITY[number])} aria-label="Visibility">
        {VISIBILITY.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <input className="setup-input" style={{ flex: 1 }} placeholder="Log it…" value={title} onChange={(e) => setTitle(e.target.value)} />
      <button className="btn btn-primary" type="button" disabled={busy} onClick={create}>+</button>
      {err && <p style={{ color: 'var(--p31-accent-red)', fontSize: 12 }}>{err}</p>}
    </div>
  )
}