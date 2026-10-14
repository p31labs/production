import { useMemo } from 'react'
import { CommandPalette as CanonCommandPalette, type CommandItem } from '@p31ca/design-core/compositions'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useModeGate } from '@/hooks/useModeGate'
import { ROUTES } from '@/lib/routes'
import type { SurfaceId } from '@/types'

/**
 * CommandPalette — canon wrapper (consume-don't-fork).
 *
 * The canon renders the cmdk palette (filtering + keyboard nav) from `items`;
 * this wrapper feeds it the portal's route list and wires selection to the
 * mode-gated navigator.
 */
export function CommandPalette() {
  const open = useWorkspaceStore((s) => s.paletteOpen)
  const closePalette = useWorkspaceStore((s) => s.closePalette)
  const { navigate } = useModeGate()

  const items = useMemo<CommandItem[]>(
    () => ROUTES
      .filter((r) => ['home', 'discover', 'playground', 'publish', 'docs'].includes(r.id))
      .map((r) => ({ id: r.id, label: r.label, icon: r.icon, description: r.path })),
    [],
  )

  return (
    <CanonCommandPalette
      open={open}
      onClose={closePalette}
      items={items}
      onSelect={(id) => navigate(id as SurfaceId)}
      placeholder="Search pages…"
    />
  )
}

export default CommandPalette