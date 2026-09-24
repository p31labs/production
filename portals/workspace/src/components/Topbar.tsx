import { useWorkspaceStore } from '@/store/workspaceStore'
import { useSpoonDial, spoonLabel } from '@/hooks/useSpoonDial'
import { roster } from '@/lib/pickleNames'
import { resolveProfile } from '@/lib/profile'
import type { SpoonLevel } from '@/types'

export function Topbar() {
  const spoons = useSpoonDial()
  const setSpoons = useWorkspaceStore((s) => s.setSpoons)
  const mode = useWorkspaceStore((s) => s.mode)
  const setCalm = useWorkspaceStore((s) => s.setCalm)
  const togglePalette = useWorkspaceStore((s) => s.togglePalette)
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const activeMemberId = useWorkspaceStore((s) => s.activeMemberId)
  const profiles = useWorkspaceStore((s) => s.profiles)
  const member = roster().find((m) => m.id === activeMemberId) ?? roster()[0]!
  const active = resolveProfile(member.id, member.emoji, profiles[member.id])

  return (
    <header className="topbar">
      <button type="button" className="topbar-brand" onClick={() => setSurface('home')}>
        <div className="p31-crown-logo">31</div>
        <span>P31 Workspace</span>
      </button>

      <div className="topbar-center">
        <button type="button" className="search-box" onClick={togglePalette} aria-label="Open Command Palette">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span>Search workspace or jump to surface…</span>
          <kbd className="search-kbd">⌘K</kbd>
        </button>
      </div>

      <div className="topbar-right">
        <span className={`badge badge-${mode}`}>{mode.toUpperCase()}</span>

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

        <button
          type="button"
          className="avatar"
          aria-label={`Profile — ${active.greetingName}`}
          onClick={() => { window.location.hash = '#/profile' }}
        >
          {active.emoji}
        </button>
        <a
          href="https://p31ca.org/journey"
          className="topbar-journey"
          aria-label="Open the P31 journey"
        >
          <span aria-hidden="true">🧭</span>
          <span>Journey</span>
        </a>
      </div>
    </header>
  )
}