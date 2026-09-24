import { useWorkspaceStore } from '@/store/workspaceStore'
import { useModeGate } from '@/hooks/useModeGate'
import { ROUTES } from '@/lib/routes'

export function SidebarNav() {
  const surface = useWorkspaceStore((s) => s.surface)
  const mode = useWorkspaceStore((s) => s.mode)
  const { navigate } = useModeGate()

  return (
    <nav className="sidebar" aria-label="Main navigation">
      {ROUTES.map((route) => {
        const locked = route.requiresMode === 'maker' && mode === 'spark'
        return (
          <button
            key={route.id}
            type="button"
            className={`nav-item ${surface === route.id ? 'active' : ''}`}
            onClick={() => navigate(route.id)}
          >
            <span aria-hidden="true">{route.icon}</span>
            <span>{route.label}</span>
            {locked && <span className="lock-icon" aria-label="Locked">🔒</span>}
          </button>
        )
      })}
<button type="button" className="nav-item" onClick={() => { window.location.hash = '#/setup' }}>
        <span aria-hidden="true">⚙</span>
        <span>Settings</span>
      </button>
    </nav>
  )
}