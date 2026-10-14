import { Topbar as CanonTopbar } from '@p31ca/design-core/compositions'
import { Input } from '@p31ca/design-core/canon-v2'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { PortalIdentity } from '@/components/PortalIdentity'
import { P31Icon } from '@/components/P31Icon'

/**
 * Topbar — canon wrapper (consume-don't-fork).
 *
 * Exactly four zones (plan W2):
 *   1. brand        → crown icon + product name
 *   2. primary nav  → Home / Discover / Playground / Publish (NavLinks)
 *   3. search       → one canon Input (Ctrl+K hint lives in the title tooltip)
 *   4. identity     → one chip ("Sign in" or the signed-in name + settings gear)
 *
 * The active nav item is a SUBTLE pill (accent-tinted surface, accent text)
 * — filled cyan is reserved for the single primary action per screen, so
 * the nav and the page's primary button never read as two primaries.
 * Removed from the chrome: MAKER badge, public/governed lens switch, spoon
 * dots, Calm pill, role chip, wordmark. Review stays routable but is not in
 * the nav. The nav renders through NavLinks so the cognitive-load gate can
 * cap nav items (R1) and count topbar interactives (R2) separately.
 */

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'discover', label: 'Discover' },
  { id: 'playground', label: 'Playground' },
  { id: 'publish', label: 'Publish' },
] as const

function NavLinks() {
  const surface = useWorkspaceStore((s) => s.surface)
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  return (
    <nav aria-label="Main" style={{ display: 'flex', gap: 'var(--p31-space-1)' }}>
      {NAV_ITEMS.map((item) => {
        const active = surface === item.id
        return (
          <a
            key={item.id}
            href={`#/${item.id}`}
            className="topbar-nav-link"
            aria-current={active ? 'page' : undefined}
            onClick={() => setSurface(item.id)}
            style={{
              color: active ? 'var(--p31-accent)' : 'var(--p31-text-secondary)',
              background: active ? 'color-mix(in oklch, var(--p31-accent) 14%, transparent)' : 'transparent',
              fontWeight: active ? 600 : 500,
              borderRadius: 'var(--p31-radius-full)',
              fontSize: 'var(--p31-text-sm)',
            }}
          >
            {item.label}
          </a>
        )
      })}
    </nav>
  )
}

export function Topbar() {
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const search = useMarketplaceStore((s) => s.search)
  const setSearch = useMarketplaceStore((s) => s.setSearch)

  const submitSearch = () => {
    setSurface('discover')
  }

  return (
    <CanonTopbar
      glass={false}
      brand={
        <a href="#/home" className="topbar-brand" onClick={() => setSurface('home')} aria-label="P31 Marketplace home">
          <P31Icon name="sovereign-crown" size={30} />
          <span>P31 Marketplace</span>
        </a>
      }
      center={<NavLinks />}
      trailing={
        <Input
          type="search"
          className="topbar-search"
          placeholder="Search"
          aria-label="Search"
          title="Search (Ctrl+K)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              submitSearch()
            }
          }}
        />
      }
      identity={<PortalIdentity />}
    />
  )
}

export default Topbar