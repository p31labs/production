import { SidebarNav as CanonSidebarNav, type SidebarNavItem } from '@p31ca/design-core/compositions'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useModeGate } from '@/hooks/useModeGate'
import { ROUTES } from '@/lib/routes'
import type { SurfaceId } from '@/types'

/**
 * SidebarNav — canon wrapper (consume-don't-fork).
 *
 * Renders the four primary surfaces (Home/Discover/Playground/Publish).
 * Review and Docs are not in any nav (plan W2); the sidebar itself is no
 * longer mounted by the App — the topbar owns primary navigation now.
 */
export function SidebarNav() {
  const surface = useWorkspaceStore((s) => s.surface)
  const { navigate } = useModeGate()

  const items: SidebarNavItem[] = ROUTES
    .filter((r) => ['home', 'discover', 'playground', 'publish'].includes(r.id))
    .map((r) => ({ path: r.id, label: r.label, emoji: r.icon }))

  const renderItem = (item: SidebarNavItem, state: { active: boolean; navigate: (path: string) => void }) => (
      <button
        type="button"
        className="sidebar-nav__link"
        aria-current={state.active ? 'page' : undefined}
        onClick={() => state.navigate(item.path)}
      >
        {item.emoji && <span aria-hidden="true">{item.emoji}</span>}
        <span>{item.label}</span>
      </button>
    )

  return (
    <CanonSidebarNav
      items={items}
      activePath={surface}
      onNavigate={(path) => navigate(path as SurfaceId)}
      renderItem={renderItem}
    />
  )
}

export default SidebarNav