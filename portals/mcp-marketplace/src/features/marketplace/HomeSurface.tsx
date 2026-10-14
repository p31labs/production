import { useEffect, useState } from 'react'
import { PageHeaderV2, Grid, Stack } from '@p31ca/design-core/canon-v2'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { listServers } from '@/lib/registryClient'
import { ServerCard } from './components'
import type { ServerSummary } from '@/types'

const HOME_CARDS = [
  { icon: '🧭', title: 'Find a tool', desc: 'Browse the list of servers.', to: 'discover' },
  { icon: '🛠️', title: 'Try a tool', desc: 'Open the playground and run one.', to: 'playground' },
  { icon: '📤', title: 'Share a tool', desc: 'Tell us about your server.', to: 'publish' },
]

const HOW_IT_WORKS = [
  { title: 'Find', line: 'Pick a tool from the catalog.' },
  { title: 'Try', line: 'Run it in the playground.' },
  { title: 'Share', line: 'Add your own server.' },
]

/** Featured row cap — the cognitive-load gate caps grid renders at 7. */
const FEATURED_MAX = 3

interface CatalogStats {
  servers: number
  live: number
  tools: number
  checkedAgoMin: number | null
}

function computeStats(servers: ServerSummary[]): CatalogStats {
  const live = servers.filter((s) => s.status === 'live').length
  const tools = servers.reduce((a, s) => a + (s.toolCount ?? 0), 0)
  const times = servers.map((s) => new Date(s.checkedAt).getTime()).filter((t) => Number.isFinite(t))
  const newest = times.length > 0 ? Math.max(...times) : null
  const checkedAgoMin = newest === null ? null : Math.max(1, Math.round((Date.now() - newest) / 60_000))
  return { servers: servers.length, live, tools, checkedAgoMin }
}

/**
 * Home — the launcher, filled with structure (H2 composition density):
 * one hero sentence, a LIVE stats row from the registry catalog (with a
 * graceful fallback), a 3-step "How it works" strip, the three big cards,
 * and a featured row of up to 3 real catalog servers. Every grid stays
 * ≤7 cards; the stats row never fabricates a number it did not fetch.
 */
export function HomeSurface() {
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const refresh = useMarketplaceStore((s) => s.refresh)
  const servers = useMarketplaceStore((s) => s.servers)

  const [catalog, setCatalog] = useState<ServerSummary[] | null>(null)
  const [statsFailed, setStatsFailed] = useState(false)

  useEffect(() => {
    if (servers.length === 0) void refresh()
  }, [servers.length, refresh])

  // The LIVE stats row: the full, unfiltered catalog — never Discover's
  // filtered slice, so the home numbers stay true no matter what was
  // searched last. Unreachable registry → the plain fallback line.
  useEffect(() => {
    let alive = true
    listServers()
      .then((s) => {
        if (alive) {
          setCatalog(s)
          setStatsFailed(false)
        }
      })
      .catch(() => {
        if (alive) setStatsFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  const stats = catalog ? computeStats(catalog) : null
  const checkedLabel =
    stats?.checkedAgoMin == null
      ? ''
      : stats.checkedAgoMin === 1
        ? ' — checked 1 minute ago'
        : ` — checked ${stats.checkedAgoMin} minutes ago`
  const featured = (catalog ?? []).filter((s) => s.status === 'live').slice(0, FEATURED_MAX)
  const featuredRow = featured.length > 0 ? featured : (catalog ?? []).slice(0, FEATURED_MAX)

  return (
    <>
      <PageHeaderV2
        title="P31"
        subtitle="Your family's toolbox, checked for you."
      />

      {statsFailed ? (
        <div className="landing-sub" role="status">We couldn't check right now.</div>
      ) : stats && (
        <div className="landing-sub" role="status" style={{ marginTop: 'var(--p31-space-3)' }}>
          {`${stats.servers} server${stats.servers === 1 ? '' : 's'} · ${stats.live} live · ${stats.tools} tools${checkedLabel}`}
        </div>
      )}

      <Stack gap="md" style={{ marginTop: 'var(--p31-space-5)' }}>
        <h2 style={{ color: 'var(--p31-text-primary)', margin: 0, fontSize: 'var(--p31-text-lg)' }}>How it works</h2>
        <div style={{ display: 'flex', gap: 'var(--p31-space-4)', flexWrap: 'wrap' }}>
          {HOW_IT_WORKS.map((s, i) => (
            <div key={s.title} style={{ flex: 1, minWidth: 160, display: 'flex', gap: 'var(--p31-space-2)', alignItems: 'baseline' }}>
              <span className="step-badge" style={{ background: 'var(--p31-accent)', color: 'var(--p31-void)', fontWeight: 700, borderRadius: 'var(--p31-radius-full)' }} aria-hidden="true">
                {i + 1}
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-1)' }}>
                <span style={{ color: 'var(--p31-text-primary)', fontWeight: 600 }}>{s.title}</span>
                <span className="surface-card-desc">{s.line}</span>
              </span>
            </div>
          ))}
        </div>
      </Stack>

      <Grid min="sm" style={{ marginTop: 'var(--p31-space-5)' }}>
        {HOME_CARDS.map((c) => (
          <button
            key={c.to}
            type="button"
            className="surface-card"
            onClick={() => setSurface(c.to as 'discover' | 'playground' | 'publish')}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-2)', textAlign: 'left', padding: 'var(--p31-space-5)' }}
          >
            <span className="surface-card-icon" aria-hidden="true" style={{ fontSize: 28 }}>{c.icon}</span>
            <span className="surface-card-title">{c.title}</span>
            <span className="surface-card-desc">{c.desc}</span>
          </button>
        ))}
      </Grid>

      {featuredRow.length > 0 && (
        <Stack gap="md" style={{ marginTop: 'var(--p31-space-5)' }}>
          <h2 style={{ color: 'var(--p31-text-primary)', margin: 0, fontSize: 'var(--p31-text-lg)' }}>Try one now</h2>
          <Grid min="sm">
            {featuredRow.slice(0, FEATURED_MAX).map((s) => (
              <ServerCard key={s.id} server={s} />
            ))}
          </Grid>
        </Stack>
      )}

      <footer style={{ marginTop: 'var(--p31-space-6)', textAlign: 'center' }}>
        <a href="#/docs" onClick={() => setSurface('docs')} style={{ color: 'var(--p31-text-muted)', fontSize: 'var(--p31-text-sm)' }}>
          Help and docs
        </a>
      </footer>
    </>
  )
}