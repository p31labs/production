import { useEffect, useState } from 'react'
import { PageHeaderV2, DetailShell, Tabs, ErrorState } from '@p31ca/design-core/canon-v2'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { getServer } from '@/lib/registryClient'
import {
  CategoryChip, StatusBadge, HealthDot, VerifyBadge, ReviewBadge, DriftBadge, ScanBadge, CapabilityBadge,
  FreshnessBadge, SourceBadge, LoveBadge, ToolCount, PriceTierBadge,
} from './components'
import { ToolDiff } from './ToolDiff'
import { ToolExplorer } from './ToolExplorer'
import { ScopedPlayground } from './ScopedPlayground'
import { InstallTab } from './InstallTab'

type Tab = 'install' | 'tools' | 'playground' | 'details'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'install', label: 'Install' },
  { id: 'tools', label: 'Tools' },
  { id: 'playground', label: 'Playground' },
  { id: 'details', label: 'Details' },
]

const HEALTH_WORD: Record<string, string> = {
  up: 'working',
  degraded: 'partially working',
  down: 'not working',
}

/**
 * ServerSurface — the per-server storefront (plan W3). The Install tab is
 * the default. Badges live here (the detail page), not on catalog cards.
 *
 * Canon v2: PageHeaderV2 (name + description + the check action) over the
 * DetailShell pattern — the summary column carries the badge stack and the
 * action row; the focus region owns the canon Tabs and their content.
 */
export function ServerSurface({ serverId }: { serverId?: string }) {
  const detail = useMarketplaceStore((s) => s.serverDetail)
  const loadServer = useMarketplaceStore((s) => s.loadServer)
  const lens = useMarketplaceStore((s) => s.lens)
  const selectTool = useMarketplaceStore((s) => s.selectTool)
  const [tab, setTab] = useState<Tab>('install')
  const [initialTool, setInitialTool] = useState<string | null>(null)

  useEffect(() => {
    if (serverId && (!detail || detail.id !== serverId)) {
      void loadServer(serverId).catch(() => {})
    }
  }, [serverId, detail, loadServer])

  if (!detail) {
    return (
      <div className="landing-sub" style={{ padding: 'var(--p31-space-6)' }}>Loading this server…</div>
    )
  }

  const openToolInPlayground = (tool: string) => {
    selectTool(tool)
    setInitialTool(tool)
    setTab('playground')
  }

  const toolCount = detail.tools.length
  const loveSettled = detail.review ? true : null

  return (
    <>
      <PageHeaderV2
        title={<>{detail.icon ?? '🧩'} {detail.name}</>}
        subtitle={detail.description}
        actions={
          <button type="button" className="btn-sm" onClick={() => void getServer(detail.id).then((d) => useMarketplaceStore.setState({ serverDetail: d }))}>
            ↻ Check again
          </button>
        }
      />

      {detail.health !== 'up' && (
        <ErrorState
          title={`This server is ${HEALTH_WORD[detail.health] ?? detail.health} right now.`}
          description={detail.healthDetail ?? 'No details were given.'}
        />
      )}

      {lens === 'governed' && (
        <div className="chip" style={{ color: 'var(--p31-accent-gold)' }}>Admin view is on.</div>
      )}

      <DetailShell
        summary={
          <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusBadge status={detail.status} />
            <ToolCount n={toolCount} />
            <FreshnessBadge checkedAt={detail.checkedAt} latencyMs={detail.latencyMs} />
            <PriceTierBadge tier={detail.priceTier} />
            <HealthDot health={detail.health} />
            <CategoryChip category={detail.category} />
            <SourceBadge source={detail.source} />
            <LoveBadge settled={loveSettled} />
            <VerifyBadge verify={detail.verify} />
            <ReviewBadge review={detail.review} />
            <ScanBadge scan={detail.scan} />
            <DriftBadge drifted={detail.drifted} contentHash={detail.contentHash} baselineHash={detail.baselineHash} />
            <CapabilityBadge capabilities={detail.capabilities} />
            {detail.readOnlySafe && <span className="chip" style={{ color: 'var(--p31-accent-green)' }}>safe to read</span>}
            {detail.localNote && <span className="chip" style={{ color: 'var(--p31-accent-gold)' }}>{detail.localNote}</span>}
          </div>
        }
        focus={
          <>
            <Tabs
              items={TABS}
              activeId={tab}
              onSelect={(id) => setTab(id as Tab)}
              ariaLabel="Server sections"
            />

            {tab === 'details' && (
              <>
                {detail.baselineTools && detail.baselineTools.length > 0 && (
                  <section style={{ marginBottom: 'var(--p31-space-5)' }}>
                    <h2 style={{ color: 'var(--p31-text-primary)' }}>Changes since last review <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>{detail.drifted ? 'changed' : 'unchanged'}</span></h2>
                    <ToolDiff current={detail.tools} baseline={detail.baselineTools} />
                  </section>
                )}
                <section>
                  <h2 style={{ color: 'var(--p31-text-primary)' }}>About</h2>
                  <div className="surface-panel" style={{ flexDirection: 'column', gap: 'var(--p31-space-2)' }}>
                    <div className="surface-card-desc">{detail.description}</div>
                    <div style={{ display: 'flex', gap: 'var(--p31-space-2)', flexWrap: 'wrap' }}>
                      <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>made by {detail.author ?? '—'}</span>
                      {detail.tags.map((t) => <span key={t} className="chip" style={{ color: 'var(--p31-accent-violet)' }}>{t}</span>)}
                    </div>
                  </div>
                </section>
              </>
            )}

            {tab === 'tools' && (
              <section>
                <h2 style={{ color: 'var(--p31-text-primary)' }}>Tools <span className="chip" style={{ color: 'var(--p31-text-muted)' }}>{toolCount}</span></h2>
                <div style={{ marginTop: 'var(--p31-space-3)' }}>
                  <ToolExplorer tools={detail.tools} onOpenTool={openToolInPlayground} />
                </div>
              </section>
            )}

            {tab === 'playground' && (
              <ScopedPlayground
                serverId={detail.id}
                serverName={detail.name}
                endpoint={detail.endpoint}
                tools={detail.tools}
                readOnlySafe={detail.readOnlySafe}
                initialTool={initialTool}
              />
            )}

            {tab === 'install' && <InstallTab id={detail.id} endpoint={detail.endpoint} name={detail.name} />}
          </>
        }
      />
    </>
  )
}