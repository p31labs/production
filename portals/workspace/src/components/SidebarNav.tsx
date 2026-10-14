import { SidebarNav as CanonSidebarNav, type SidebarNavItem } from '@p31ca/design-core/compositions'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useModeGate } from '@/hooks/useModeGate'
import { ROUTES } from '@/lib/routes'
import type { SurfaceId } from '@/types'

/**
 * SidebarNav — consumer wrapper over the canon SidebarNav composition.
 * The canon owns the nav container, active-state computation and ARIA; the
 * portal supplies structured items plus a renderItem that keeps its own
 * `.nav-item` buttons (including the mode-lock badge and the Settings entry).
 */
export function SidebarNav() {
  const surface = useWorkspaceStore((s) => s.surface)
  const mode = useWorkspaceStore((s) => s.mode)
  const { navigate } = useModeGate()

  const items: SidebarNavItem[] = [
    ...ROUTES.map((route) => ({ path: route.id, label: route.label, emoji: route.icon })),
    { path: 'settings', label: 'Settings', emoji: '⚙' },
  ]

  return (
    <CanonSidebarNav
      className="workspace-sidebar"
      ariaLabel="Main navigation"
      items={items}
      activePath={surface}
      onNavigate={(path) => navigate(path as SurfaceId)}
      renderItem={(item, state) => {
        const route = ROUTES.find((r) => r.id === item.path)
        const locked = route?.requiresMode === 'maker' && mode === 'spark'
        const isSettings = item.path === 'settings'
        return (
          <button
            key={item.path}
            type="button"
            className={`nav-item ${state.active ? 'active' : ''}`}
            onClick={() => {
              if (isSettings) {
                window.location.hash = '#/setup'
              } else {
                state.navigate(item.path)
              }
            }}
          >
            <span aria-hidden="true">{item.emoji}</span>
            <span>{item.label}</span>
            {locked && <span className="lock-icon" aria-label="Locked">🔒</span>}
          </button>
        )
      }}
    />
  )
}