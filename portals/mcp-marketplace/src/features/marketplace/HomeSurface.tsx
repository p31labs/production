import { useEffect } from 'react'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { ServerCard } from './components'

/**
 * Home — the launcher. Live stats from the real registry, then the fleet.
 * No invented metrics: counts are what the registry reports right now.
 */
export function HomeSurface() {
  const { servers, categories, loading, error, loadedAt, refresh } = useMarketplaceStore()

  useEffect(() => {
    if (servers.length === 0) void refresh()
  }, [servers.length, refresh])

  const live = servers.filter((s) => s.health === 'up').length
  const totalTools = servers.reduce((a, s) => a + s.toolCount, 0)

  return (
    <div className="home-container">
      <section className="home-hero">
        <h1 className="greeting-h1">MCP <span style={{ background: 'linear-gradient(135deg, var(--p31-accent), var(--p31-accent-violet), var(--p31-accent-gold))', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent' }}>Marketplace</span></h1>
        <p className="landing-sub">Sovereign MCP servers, live-probed and verified. Discover any tool, open it in the playground, call it for real.</p>
      </section>

      <section className="launcher-grid" aria-label="Live fleet stats">
        <div className="surface-card">
          <div className="surface-card-icon">🛰️</div>
          <div className="surface-card-title">{servers.length}</div>
          <div className="surface-card-desc">servers in catalog</div>
        </div>
        <div className="surface-card">
          <div className="surface-card-icon">🟢</div>
          <div className="surface-card-title">{live}</div>
          <div className="surface-card-desc">live right now</div>
        </div>
        <div className="surface-card">
          <div className="surface-card-icon">🧰</div>
          <div className="surface-card-title">{totalTools}</div>
          <div className="surface-card-desc">tools exposed</div>
        </div>
        <div className="surface-card">
          <div className="surface-card-icon">🏷️</div>
          <div className="surface-card-title">{categories.length}</div>
          <div className="surface-card-desc">categories</div>
        </div>
      </section>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-3)', margin: 'var(--p31-space-5) 0 var(--p31-space-3)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)' }}>The fleet</h2>
        <button type="button" className="btn-sm" onClick={() => void refresh()} disabled={loading}>
          {loading ? 'probing…' : '↻ refresh'}
        </button>
        {loadedAt && <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>probed {new Date(loadedAt).toISOString().slice(0, 19)}Z</span>}
        <a href="#/discover" style={{ marginLeft: 'auto', color: 'var(--p31-accent)' }}>Browse all →</a>
      </div>

      {error && <div className="setup-err" style={{ marginBottom: 'var(--p31-space-3)' }}>Registry unreachable: {error} — this is the live state, not a mock.</div>}

      <div className="launcher-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {servers.slice(0, 12).map((s) => <ServerCard key={s.id} server={s} />)}
      </div>
    </div>
  )
}