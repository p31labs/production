import { MobileBottomNav as CanonMobileBottomNav } from '@p31ca/design-core/compositions'
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

/**
 * MobileBottomNav — consumer wrapper over the canon MobileBottomNav
 * composition. The canon owns the nav container and active-state logic; the
 * portal supplies structured items and a renderItem that keeps its own
 * `.mobile-bottom-nav__btn` buttons (icon-only, dimmed when inactive).
 */
export function MobileBottomNav() {
  const surface = useWorkspaceStore((s) => s.surface)
  const { navigate } = useModeGate()

  return (
    <CanonMobileBottomNav
      items={ITEMS.map((item) => ({ path: item.id, label: item.label, emoji: item.icon, flagship: true }))}
      activePath={surface}
      onNavigate={(path) => navigate(path as SurfaceId)}
      renderItem={(item, state) => (
        <button
          key={item.path}
          type="button"
          onClick={() => state.navigate(item.path)}
          aria-label={item.label}
          className="mobile-bottom-nav__btn"
          style={{ opacity: state.active ? 1 : 0.6 }}
        >
          {item.emoji}
        </button>
      )}
    />
  )
}