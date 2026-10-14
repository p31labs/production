import { MobileBottomNav as CanonMobileBottomNav, type SidebarNavItem } from '@p31ca/design-core/compositions'
import { useModeGate } from '@/hooks/useModeGate'
import { useWorkspaceStore } from '@/store/workspaceStore'
import type { SurfaceId } from '@/types'

const ITEMS: SidebarNavItem[] = [
  { path: 'home', label: 'Home', emoji: '🏠', flagship: true },
  { path: 'discover', label: 'Discover', emoji: '🧩', flagship: true },
  { path: 'playground', label: 'Playground', emoji: '🛠️', flagship: true },
  { path: 'publish', label: 'Publish', emoji: '📤', flagship: true },
]

/**
 * MobileBottomNav — canon wrapper (consume-don't-fork).
 *
 * Canon owns the bottom-nav chrome (flagship items only, active-path
 * matching); this wrapper supplies the portal's route set + gate-aware
 * navigation from the workspace store.
 */
export function MobileBottomNav() {
  const surface = useWorkspaceStore((s) => s.surface)
  const { navigate } = useModeGate()

  return (
    <CanonMobileBottomNav
      items={ITEMS}
      activePath={surface}
      onNavigate={(path) => navigate(path as SurfaceId)}
    />
  )
}

export default MobileBottomNav