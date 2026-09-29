import { useMemo, useState } from 'react'
import { PackCard } from '../components/PackCard'
import manifest from '../data/manifest.json'

export default function Catalog() {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState<string>('all')

  const kinds = useMemo(() => ['all', ...new Set(manifest.packs.map((p) => p.kind))], [])
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return manifest.packs.filter((p) => {
      if (kind !== 'all' && p.kind !== kind) return false
      if (!needle) return true
      return (p.title + ' ' + p.filename + ' ' + p.kind).toLowerCase().includes(needle)
    })
  }, [q, kind])

  return (
    <section className="route route--catalog">
      <header className="page-header">
        <h1>Catalog</h1>
        <p className="lede">{filtered.length} of {manifest.packs.length} packs</p>
      </header>

      <div className="catalog__filters">
        <input
          className="input"
          placeholder="Search packs…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search packs"
        />
        <div className="kind-tabs" role="tablist">
          {kinds.map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={kind === k}
              className={`kind-tab ${kind === k ? 'is-active' : ''}`}
              onClick={() => setKind(k)}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="pack-grid">
        {filtered.map((p) => (
          <PackCard key={`${p.kind}/${p.id}`} pack={p} />
        ))}
      </div>
    </section>
  )
}