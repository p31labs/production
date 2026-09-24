import { useWorkspaceStore } from '@/store/workspaceStore'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useSpoonDial, spoonLabel } from '@/hooks/useSpoonDial'
import { IdentityChip } from '@/components/IdentityChip'
import { ROLE_LABEL } from '@/lib/auth'
import type { SpoonLevel } from '@/types'

const ROLE_COLOR: Record<string, string> = {
  viewer: 'var(--p31-text-muted)',
  publisher: 'var(--p31-accent-violet)',
  reviewer: 'var(--p31-accent-gold)',
  admin: 'var(--p31-accent-green)',
}

export function Topbar() {
  const spoons = useSpoonDial()
  const setSpoons = useWorkspaceStore((s) => s.setSpoons)
  const mode = useWorkspaceStore((s) => s.mode)
  const setCalm = useWorkspaceStore((s) => s.setCalm)
  const togglePalette = useWorkspaceStore((s) => s.togglePalette)
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const role = useMarketplaceStore((s) => s.me?.role)

  return (
    <header className="topbar">
      <button type="button" className="topbar-brand" onClick={() => setSurface('home')}>
        <div className="p31-crown-logo">31</div>
        <span>P31 MCP Marketplace</span>
      </button>

      <div className="topbar-center">
        <button type="button" className="search-box" onClick={togglePalette} aria-label="Open Command Palette">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search servers, tools, categories…</span>
          <kbd className="search-kbd">⌘K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        <span className={`badge badge-${mode}`}>{mode.toUpperCase()}</span>

        {role && role !== 'viewer' && (
          <span className="identity-chip" style={{ color: ROLE_COLOR[role], borderColor: 'color-mix(in oklab, ' + ROLE_COLOR[role] + ' 40%, transparent)' }}>
            {ROLE_LABEL[role]}
          </span>
        )}

        <IdentityChip />

        <div className="spoon-dial" aria-label={`Spoon dial: ${spoonLabel(spoons)}`}>
          <span className="spoon-dial-label">SPOONS</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={`spoon-dot ${n <= spoons ? 'active' : ''}`}
              onClick={() => setSpoons(n as SpoonLevel)}
              aria-label={`Set spoon level ${n}`}
            />
          ))}
          <button type="button" className="spoon-crisis-btn" onClick={() => setCalm(true)}>
            Calm
          </button>
        </div>
      </div>
    </header>
  )
}