import { useEffect } from 'react'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { getServer } from '@/lib/registryClient'
import { CategoryChip, StatusBadge, HealthDot, VerifyBadge, ReviewBadge, DriftBadge, ScanBadge, CapabilityBadge, FreshnessBadge, RiskChip } from './components'
import { ToolDiff } from './ToolDiff'

/**
 * ServerSurface — detail view for one server: live health, verify metadata,
 * and the tool list grouped by risk. "Open in Playground" jumps straight into
 * an interactive session for this server.
 */
export function ServerSurface({ serverId }: { serverId?: string }) {
  const detail = useMarketplaceStore((s) => s.serverDetail)
  const loadServer = useMarketplaceStore((s) => s.loadServer)

  useEffect(() => {
    if (serverId && (!detail || detail.id !== serverId)) {
      void loadServer(serverId).catch(() => {})
    }
  }, [serverId, detail, loadServer])

  if (!detail) {
    return (
      <div className="home-container">
        <div className="landing-sub">Loading server…</div>
      </div>
    )
  }

  const readTools = detail.tools.filter((t) => t.risk === 'read')
  const writeTools = detail.tools.filter((t) => t.risk === 'write')

  const openPlayground = (tool?: string) => {
    useMarketplaceStore.getState().selectTool(tool ?? null)
    window.location.hash = '#/playground'
  }

  return (
    <div className="home-container">
      <section className="home-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-3)', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '2rem' }} aria-hidden="true">{detail.icon ?? '🧩'}</span>
          <h1 className="greeting-h1">{detail.name}</h1>
          <StatusBadge status={detail.status} />
          <HealthDot health={detail.health} />
          <CategoryChip category={detail.category} />
        </div>
        <p className="landing-sub">{detail.description}</p>
        <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
          <VerifyBadge verify={detail.verify} />
          <ReviewBadge review={detail.review} />
          <ScanBadge scan={detail.scan} />
          <DriftBadge drifted={detail.drifted} contentHash={detail.contentHash} baselineHash={detail.baselineHash} />
          <CapabilityBadge capabilities={detail.capabilities} />
          <FreshnessBadge checkedAt={detail.checkedAt} latencyMs={detail.latencyMs} />
          <span className="chip" style={{ color: 'var(--p31-text-muted)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>{detail.endpoint}</span>
          {detail.readOnlySafe && <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>read-only safe</span>}
          {detail.localNote && <span className="chip" style={{ color: 'var(--p31-accent-gold)' }}>{detail.localNote}</span>}
        </div>
        <div style={{ display: 'flex', gap: 'var(--p31-space-3)', marginTop: 'var(--p31-space-4)' }}>
          <button type="button" className="btn-sm" onClick={() => openPlayground()} style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--p31-radius-md)' }}>
            🛠️ Open in Playground →
          </button>
          <button type="button" className="btn-sm" onClick={() => void getServer(detail.id).then((d) => useMarketplaceStore.setState({ serverDetail: d }))}>
            ↻ re-probe
          </button>
        </div>
      </section>

      {detail.health !== 'up' && (
        <div className="setup-err" style={{ marginBottom: 'var(--p31-space-3)' }}>
          health: {detail.health} · {detail.healthDetail ?? 'no detail'}
        </div>
      )}

      {detail.baselineTools && detail.baselineTools.length > 0 && (
        <section style={{ marginBottom: 'var(--p31-space-5)' }}>
          <h2 style={{ color: 'var(--p31-text-primary)' }}>Surface diff vs last review <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>{detail.drifted ? 'drifted' : 'unchanged'}</span></h2>
          <ToolDiff current={detail.tools} baseline={detail.baselineTools} />
        </section>
      )}

      <section style={{ marginBottom: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)' }}>Read-only tools <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>{readTools.length}</span></h2>
        <div className="launcher-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', marginTop: 'var(--p31-space-3)' }}>
          {readTools.map((t) => (
            <button key={t.name} type="button" className="surface-card" onClick={() => openPlayground(t.name)} style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)' }}>
                <span className="surface-card-icon">🔍</span>
                <RiskChip risk={t.risk} />
              </div>
              <div className="surface-card-title" style={{ fontSize: 'var(--p31-text-sm)' }}>{t.name}</div>
              <div className="surface-card-desc">{t.description ?? '—'}</div>
            </button>
          ))}
          {readTools.length === 0 && <div className="landing-sub">None exposed.</div>}
        </div>
      </section>

      <section>
        <h2 style={{ color: 'var(--p31-text-primary)' }}>Write / stateful tools <span className="chip" style={{ color: 'var(--p31-accent-red)' }}>{writeTools.length}</span></h2>
        <div className="launcher-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', marginTop: 'var(--p31-space-3)' }}>
          {writeTools.map((t) => (
            <button key={t.name} type="button" className="surface-card" onClick={() => openPlayground(t.name)} style={{ textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p31-space-2)' }}>
                <span className="surface-card-icon">✍️</span>
                <RiskChip risk={t.risk} />
              </div>
              <div className="surface-card-title" style={{ fontSize: 'var(--p31-text-sm)' }}>{t.name}</div>
              <div className="surface-card-desc">{t.description ?? '—'}</div>
            </button>
          ))}
          {writeTools.length === 0 && <div className="landing-sub">None exposed.</div>}
        </div>
      </section>
    </div>
  )
}