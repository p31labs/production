import { useCallback, useEffect, useState } from 'react'
import { MCP_TOOLS } from '@/lib/mcpTools'

const API = 'https://forum-api.trimtab-signal.workers.dev'

interface Thread {
  id: string
  title: string
  body: string
  author_did: string
  tags: string
  status: string
  created_at: number
  updated_at: number
  answer_count: number
}

interface Post {
  id: string
  thread_id: string
  parent_id: string | null
  body: string
  author_did: string
  accepted: number
  created_at: number
}

/**
 * ForumSurface — the Q&A forum, merged with the blog.
 *
 * Each thread id is a blog slug: the p31ca bridge writes /blog/<slug>.md and
 * the forum seeds a thread with the same slug, so a post and its discussion
 * are one thing. The "discuss" link on a blog post lands here.
 *
 * Register-1 surface: speaks as the system, no trigger words, identities are
 * did:key pickles (never real names). The worker owns truth; this is a view.
 */
export function ForumSurface() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [openThread, setOpenThread] = useState<{ thread: Thread; posts: Post[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  const loadThreads = useCallback(async () => {
    try {
      const r = await fetch(`${API}/threads`)
      const d = await r.json()
      setThreads(d.threads ?? [])
    } catch (e) {
      setError(String((e as Error)?.message ?? e))
    }
  }, [])

  useEffect(() => { void loadThreads() }, [loadThreads])

  useEffect(() => {
    if (!openId) { setOpenThread(null); return }
    let cancelled = false
    fetch(`${API}/threads/${openId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setOpenThread(d) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [openId])

  return (
    <section className="surface-panel active" data-mcp-tool={MCP_TOOLS.forum} aria-label="Forum surface">
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <div className="docs-toolbar" style={{ borderBottom: '1px solid var(--p31-glass-border)', padding: 'var(--p31-space-2)' }}>
            <button className="btn btn-primary" type="button" onClick={() => setOpenId('new')}>+ Ask</button>
          </div>
          <div style={{ padding: 'var(--p31-space-2)' }}>
            <input
              className="setup-input"
              style={{ width: '100%' }}
              placeholder="Search threads…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearching(true) }}
            />
          </div>
          {searching && query && (
            <SearchResults query={query} onOpen={(id) => { setOpenId(id); setSearching(false); setQuery('') }} />
          )}
          <div style={{ fontSize: 12, color: 'var(--p31-cloud)', fontWeight: 600, padding: 'var(--p31-space-3)' }} role="heading" aria-level={2}>
            THREADS
          </div>
          <div role="list" aria-label="Thread list">
            {threads.map((t) => (
              <button
                key={t.id}
                type="button"
                role="listitem"
                className="docs-item"
                style={{ width: '100%' }}
                onClick={() => setOpenId(t.id)}
                aria-pressed={openId === t.id}
              >
                <span style={{ fontWeight: 600 }}>{t.title}</span>
                <span style={{ fontSize: 11, color: 'var(--p31-cloud)' }}>{t.answer_count} answer(s)</span>
              </button>
            ))}
          </div>
          {error && <p style={{ fontSize: 12, color: 'var(--p31-accent-red)', padding: 'var(--p31-space-3)' }} role="alert">{error}</p>}
        </aside>

        <div className="docs-main" style={{ padding: 'var(--p31-space-5)' }} aria-live="polite">
          {openId === 'new' ? (
            <NewThread onCreated={(id) => { setOpenId(id); void loadThreads() }} />
          ) : openThread ? (
            <ThreadView thread={openThread.thread} posts={openThread.posts} onRefresh={() => setOpenId(openThread.thread.id)} />
          ) : (
            <p style={{ color: 'var(--p31-cloud)' }}>Select a thread, or ask a question. Each blog post has a thread here.</p>
          )}
        </div>
      </div>
    </section>
  )
}

function SearchResults({ query, onOpen }: { query: string; onOpen: (id: string) => void }) {
  const [results, setResults] = useState<Array<{ type: string; id: string; title?: string; thread_id?: string; snippet?: string }> | null>(null)
  useEffect(() => {
    let cancelled = false
    const t = setTimeout(() => {
      fetch(`${API}/search?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setResults(d.results ?? []) })
        .catch(() => { if (!cancelled) setResults([]) })
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query])

  if (results === null) return <p style={{ fontSize: 12, color: 'var(--p31-cloud)', padding: 'var(--p31-space-2)' }}>Searching…</p>
  if (results.length === 0) return <p style={{ fontSize: 12, color: 'var(--p31-cloud)', padding: 'var(--p31-space-2)' }}>No matches.</p>
  return (
    <div style={{ padding: 'var(--p31-space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)' }}>
      {results.slice(0, 8).map((r) => (
        <button
          key={`${r.type}-${r.id}`}
          type="button"
          className="docs-item"
          style={{ width: '100%', textAlign: 'left' }}
          onClick={() => onOpen(r.thread_id ?? r.id)}
        >
          <span style={{ fontSize: 12, color: 'var(--p31-accent)', textTransform: 'uppercase' }}>{r.type}</span>
          <span style={{ fontWeight: 600 }}>{r.title ?? r.snippet}</span>
        </button>
      ))}
    </div>
  )
}

function short(did: string): string {
  return did.length > 18 ? `${did.slice(0, 18)}…` : did
}

function ThreadView({ thread, posts, onRefresh }: { thread: Thread; posts: Post[]; onRefresh: () => void }) {
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function answer() {
    if (!body.trim()) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch(`${API}/threads/${thread.id}/posts`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ body }),
      })
      if (!r.ok) { setErr('not authorized — sign in with a passport'); return }
      setBody(''); onRefresh()
    } finally { setBusy(false) }
  }

  return (
    <>
      <h2 className="control-surface__title" style={{ fontSize: 'var(--p31-text-h3)' }}>{thread.title}</h2>
      <p style={{ color: 'var(--p31-cloud)', fontSize: 'var(--p31-text-sm)' }}>
        asked by {short(thread.author_did)} · {new Date(thread.created_at).toLocaleDateString()} · {thread.answer_count} answer(s)
      </p>
      {thread.body && <p style={{ marginTop: 'var(--p31-space-3)' }}>{thread.body}</p>}
      <div style={{ marginTop: 'var(--p31-space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-3)' }}>
        {posts.map((p) => (
          <article key={p.id} style={{
            background: 'var(--p31-surface)',
            borderRadius: 'var(--p31-radius-sm)',
            padding: 'var(--p31-space-4)',
            border: p.accepted ? '1px solid var(--p31-accent-green)' : '1px solid var(--p31-glass-border)',
          }}>
            <p>{p.body}</p>
            <footer style={{ fontSize: 12, color: 'var(--p31-cloud)', marginTop: 'var(--p31-space-2)' }}>
              {short(p.author_did)} · {new Date(p.created_at).toLocaleDateString()}
              {p.accepted ? ' · ✓ accepted' : ''}
            </footer>
          </article>
        ))}
      </div>
      <div style={{ marginTop: 'var(--p31-space-5)', display: 'flex', gap: 'var(--p31-space-3)' }}>
        <input
          className="setup-input"
          style={{ flex: 1 }}
          value={body}
          placeholder="Your answer…"
          onChange={(e) => setBody(e.target.value)}
        />
        <button className="btn btn-primary" type="button" disabled={busy} onClick={answer}>Answer</button>
      </div>
      {err && <p style={{ color: 'var(--p31-accent-red)', fontSize: 12, marginTop: 'var(--p31-space-2)' }}>{err}</p>}
    </>
  )
}

function NewThread({ onCreated }: { onCreated: (id: string) => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function create() {
    if (!title.trim() || !body.trim()) return
    setBusy(true); setErr(null)
    try {
      const r = await fetch(`${API}/threads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, body }),
      })
      const d = await r.json()
      if (!r.ok) { setErr(String(d?.error ?? 'failed')); return }
      onCreated(d.id)
    } finally { setBusy(false) }
  }

  return (
    <>
      <h2 className="control-surface__title" style={{ fontSize: 'var(--p31-text-h3)' }}>Ask a question</h2>
      <input className="setup-input" style={{ width: '100%', marginTop: 'var(--p31-space-3)' }} placeholder="Question" value={title} onChange={(e) => setTitle(e.target.value)} />
      <textarea className="setup-input" style={{ width: '100%', minHeight: 120, marginTop: 'var(--p31-space-3)' }} placeholder="Details…" value={body} onChange={(e) => setBody(e.target.value)} />
      <button className="btn btn-primary" type="button" style={{ marginTop: 'var(--p31-space-3)' }} disabled={busy} onClick={create}>Ask</button>
      {err && <p style={{ color: 'var(--p31-accent-red)', fontSize: 12, marginTop: 'var(--p31-space-2)' }}>{err}</p>}
    </>
  )
}