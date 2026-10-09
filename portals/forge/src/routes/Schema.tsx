import { useEffect, useState } from 'react'

/** Schema — fetches the hosted canon→JSON Schema agent contract and renders
 *  the component catalog. Proves the forge portal consumes the same schema
 *  the Dreamer is constrained against.
 *  Source: https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema */
const SCHEMA_URL = 'https://phos-ai-proxy.trimtab-signal.workers.dev/ui-schema'

interface SchemaComponent {
  name: string
  category?: string
  importPath?: string | null
  cssClass?: string | null
  tokens?: string[]
}

interface UiSchemaResponse {
  schema: { properties: { type: { enum: string[] } } }
  catalog: { components: SchemaComponent[] }
}

export default function Schema() {
  const [state, setState] = useState<{ loading: boolean; data: UiSchemaResponse | null; error: string | null }>({ loading: true, data: null, error: null })
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')

  useEffect(() => {
    let cancelled = false
    fetch(SCHEMA_URL)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (!cancelled) setState({ loading: false, data, error: null }) })
      .catch((e) => { if (!cancelled) setState({ loading: false, data: null, error: String(e?.message ?? e) }) })
    return () => { cancelled = true }
  }, [])

  const comps = state.data?.catalog.components ?? []
  const cats = ['all', ...new Set(comps.map((c) => c.category).filter((x): x is string => Boolean(x)))]
  const filtered = comps.filter((c) => {
    if (cat !== 'all' && c.category !== cat) return false
    const needle = q.trim().toLowerCase()
    if (!needle) return true
    return (c.name + ' ' + (c.cssClass ?? '')).toLowerCase().includes(needle)
  })

  return (
    <section className="route route--schema">
      <header className="page-header">
        <h1>Schema</h1>
        <p className="lede">
          {state.loading ? 'Fetching the canon→JSON Schema…' : state.error ? `Schema unavailable: ${state.error}` : `${comps.length} components from the agent contract`}
        </p>
      </header>

      {state.error && <div className="error-card">{state.error}</div>}

      {!state.loading && !state.error && (
        <>
          <div className="catalog__filters">
            <input className="input" placeholder="Search components…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search components" />
            <div className="kind-tabs" role="tablist">
              {cats.map((c) => (
                <button key={c} role="tab" aria-selected={cat === c} className={`kind-tab${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="catalog__grid">
            {filtered.map((c) => (
              <article className="pack-card" key={c.name}>
                <h3>{c.name}</h3>
                {c.category && <span className="pack-kind">{c.category}</span>}
                <code className="schema-import">{c.importPath ?? '@p31ca/design-core/compositions'}</code>
                {c.cssClass && <div className="schema-css">.{c.cssClass}</div>}
              </article>
            ))}
          </div>
          <p className="catalog__count">{filtered.length} shown</p>
        </>
      )}
    </section>
  )
}