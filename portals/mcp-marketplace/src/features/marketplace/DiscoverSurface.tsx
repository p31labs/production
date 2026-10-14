import { useEffect, useState } from 'react'
import { PageHeaderV2, ListingShell, Input, Select, ErrorState } from '@p31ca/design-core/canon-v2'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { listServers } from '@/lib/registryClient'
import { humanError } from '@/lib/humanErrors'
import { ServerCard, StatusBadge, STATUS_LABEL } from './components'
import { InspectUrlPanel } from './InspectUrlPanel'

const CATEGORIES = ['all', 'design', 'crypto', 'government', 'finance', 'social', 'infra', 'local'] as const
const STATUSES = ['all', 'live', 'unverified', 'degraded', 'down'] as const

/** Cards shown per page — the cognitive-load gate caps grid renders at 7. */
const PAGE_SIZE = 7

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c === 'all' ? 'All categories' : c }))
const STATUS_OPTIONS = STATUSES.map((s) => ({ value: s, label: s === 'all' ? 'All statuses' : STATUS_LABEL[s] }))

/**
 * Discover — the catalog (plan W3). Real empty state, simple cards
 * (name, one-line description, one "Open" button), badges live on the
 * detail page only. The grid pages in sevens with a Show-more step.
 *
 * Canon v2: PageHeaderV2 + the ListingShell pattern — a search/filter row
 * of canon controls (data-p31-control, 44px control floor), the card grid,
 * and the EmptyState when nothing matches. Catalog errors render as an
 * ErrorState (role=alert), loading as a skeleton.
 */
export function DiscoverSurface() {
  const { servers, search, categoryFilter, statusFilter, loading, error, setSearch, setCategoryFilter, setStatusFilter, lens } = useMarketplaceStore()
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    const t = setTimeout(() => {
      void listServers({
        q: search || undefined,
        category: categoryFilter === 'all' ? undefined : categoryFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
      }).then((s) => useMarketplaceStore.setState({ servers: s })).catch((e: unknown) => useMarketplaceStore.setState({ error: humanError(e instanceof Error ? e.message : String(e)) }))
    }, 250)
    return () => clearTimeout(t)
  }, [search, categoryFilter, statusFilter])

  useEffect(() => {
    setVisible(PAGE_SIZE)
  }, [search, categoryFilter, statusFilter])

  const shownCount = Math.min(visible, servers.length)
  const remaining = servers.length - shownCount

  const liveCount = servers.filter((s) => s.status === 'live').length
  const toolTotal = servers.reduce((a, s) => a + (s.toolCount ?? 0), 0)

  return (
    <>
      <PageHeaderV2
        title="Discover"
        subtitle="Every server here is real. We check each one when you visit."
      />

      <InspectUrlPanel />

      {(!loading || servers.length > 0) && (
        <div className="landing-sub" role="status" style={{ marginBottom: 'var(--p31-space-3)' }}>
          {`Showing ${servers.length} server${servers.length === 1 ? '' : 's'} · ${liveCount} live · ${toolTotal} tools`}
        </div>
      )}

      <ListingShell
        controls={
          <>
            <Input
              type="text"
              placeholder="Search servers, tools, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search servers, tools, tags"
            />
            <Select
              options={CATEGORY_OPTIONS}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            />
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
            />
          </>
        }
        emptyTitle="Nothing matches yet"
        emptyDescription="Try a different search, or Try a server."
      >
        {loading && servers.length === 0
          ? [<div key="loading" className="landing-sub">Loading the catalog…</div>]
          : servers.slice(0, visible).map((s) => <ServerCard key={s.id} server={s} />)}
      </ListingShell>

      {lens === 'governed' && <div className="chip" style={{ color: 'var(--p31-accent-gold)', marginTop: 'var(--p31-space-3)' }}>Admin view is on.</div>}

      <details style={{ marginTop: 'var(--p31-space-4)' }}>
        <summary style={{ color: 'var(--p31-text-muted)', cursor: 'pointer', fontSize: 'var(--p31-text-sm)' }}>What the badges mean</summary>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', marginTop: 'var(--p31-space-3)' }}>
          <div><StatusBadge status="live" /> means it answered our last check.</div>
          <div><StatusBadge status="unverified" /> means it is new and not checked yet.</div>
          <div><StatusBadge status="degraded" /> means it works part of the time.</div>
          <div><StatusBadge status="down" /> means it did not answer our last check.</div>
          <div><span className="chip" style={{ color: 'var(--p31-accent-green)', fontFamily: 'var(--p31-font-mono)', fontSize: 'var(--p31-text-xs)' }}>Verified</span> means a P31 check signed it.</div>
          <div><span className="chip" style={{ color: 'var(--p31-accent-green)' }}>✓ reviewed</span> means a person looked it over.</div>
          <div><span className="chip" style={{ color: 'var(--p31-accent-green)' }}>Safety check: clean</span> means the code scan found nothing bad.</div>
          <div><span className="chip" style={{ color: 'var(--p31-accent-green)' }}>safe to read</span> means it only reads. It never changes your stuff.</div>
        </div>
      </details>

      {error && (
        <ErrorState
          title="We could not load the catalog."
          description={error}
        />
      )}

      {remaining > 0 && (
        <div style={{ textAlign: 'center', marginTop: 'var(--p31-space-4)' }}>
          <button type="button" className="btn-sm" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Show more ({remaining} left)
          </button>
        </div>
      )}
    </>
  )
}