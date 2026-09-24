import { useModeGate } from '@/hooks/useModeGate'
import { useWorkspaceStore } from '@/store/workspaceStore'
import type { SurfaceId } from '@/types'

const ITEMS: Array<{ id: SurfaceId; icon: string; label: string }> = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'docs', icon: '📄', label: 'Docs' },
  { id: 'sheets', icon: '📊', label: 'Sheets' },
  { id: 'calendar', icon: '📅', label: 'Calendar' },
  { id: 'mail', icon: '✉️', label: 'Mail' },
]

export function MobileBottomNav() {
  const surface = useWorkspaceStore((s) => s.surface)
  const { navigate } = useModeGate()

  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => navigate(item.id)}
          aria-label={item.label}
          className="mobile-bottom-nav__btn"
          style={{ opacity: surface === item.id ? 1 : 0.6 }}
        >
          {item.icon}
        </button>
      ))}
    </nav>
  )
}