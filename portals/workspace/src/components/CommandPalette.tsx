import { CommandPalette as CanonCommandPalette, type CommandItem } from '@p31ca/design-core/compositions'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useModeGate } from '@/hooks/useModeGate'
import { ROUTES } from '@/lib/routes'
import type { SurfaceId } from '@/types'

/**
 * CommandPalette — consumer wrapper over the canon CommandPalette
 * composition. The canon owns the overlay chrome, filtering and keyboard
 * navigation; the portal supplies the surface list and owns routing on
 * select.
 */
export function CommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen)
  const closePalette = useWorkspaceStore((s) => s.closePalette)
  const { navigate } = useModeGate()

  const items: CommandItem[] = ROUTES.map((route) => ({
    id: route.id,
    label: route.label,
    icon: route.icon,
    description: `Jump to ${route.label}`,
  }))

  return (
    <CanonCommandPalette
      open={open}
      onClose={closePalette}
      items={items}
      onSelect={(id) => {
        closePalette()
        navigate(id as SurfaceId)
      }}
      placeholder="Type a surface name or command…"
    />
  )
}