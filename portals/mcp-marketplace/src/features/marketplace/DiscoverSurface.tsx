import { useEffect } from 'react'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { listServers } from '@/lib/registryClient'
import { ServerCard } from './components'

const CATEGORIES = ['all', 'design', 'crypto', 'government', 'finance', 'social', 'infra', 'local'] as const
const STATUSES = ['all', 'live', 'unverified', 'degraded', 'down'] as const

/**
 * Discover — the catalog grid. Server-side search/filter against the registry
 * (live data; filters hit GET /servers?q=&category=&status=).
 */
export function DiscoverSurface() {
  const { servers, search, categoryFilter, statusFilter, loading, error, setSearch, setCategoryFilter, setStatusFilter } = useMarketplaceStore()

  useEffect(() => {
    const t = setTimeout(() => {
      void listServers({
        q: search || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }).then((s) => useMarketplaceStore.setState({ servers: s })).catch((e: unknown) => useMarketplaceStore.setState({ error: e instanceof Error ? e.message : String(e) }))
    }, 250)
    return () => clearTimeout(t)
  }, [search, categoryFilter, statusFilter])

  return (
    <div className="home-container">
      <section className="home-hero">
        <h1 className="greeting-h1">Discover</h1>
        <p className="landing-sub">Every server is probed live by the registry — health, tool schemas, and verification are real, not curated claims.</p>
      </section>

      <div className="surface-panel" style={{ display: 'flex', gap: 'var(--p31-space-3)', flexWrap: 'wrap', alignItems: 'center', marginBottom: 'var(--p31-space-4)' }}>
        <input
          type="text"
          className="setup-input"
          placeholder="Search servers, tools, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 180 }}
        />
        <select className="setup-input" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} aria-label="Filter by category">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c}</option>)}
        </select>
        <select className="setup-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
        </select>
      </div>

      {error && <div className="setup-err" style={{ marginBottom: 'var(--p31-space-3)' }}>Registry unreachable: {error}</div>}
      {loading && servers.length === 0 && <div className="landing-sub">Loading the live catalog…</div>}

      <div className="launcher-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {servers.map((s) => <ServerCard key={s.id} server={s} />)}
      </div>
      {servers.length === 0 && !loading && <div className="landing-sub" style={{ marginTop: 'var(--p31-space-4)' }}>No servers match the current filters.</div>}
    </div>
  )
}