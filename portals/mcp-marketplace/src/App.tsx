import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useMarketplaceStore } from '@/store/marketplaceStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useSpoonDial } from '@/hooks/useSpoonDial'
import { useThemeEffects } from '@/hooks/useThemeEffects'

import { Starfield } from '@/components/Starfield'
import { NotificationStack } from '@/components/NotificationStack'
import { Topbar } from '@/components/Topbar'
import { SidebarNav } from '@/components/SidebarNav'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { ModeGateModal } from '@/components/ModeGateModal'
import { CommandPalette } from '@/components/CommandPalette'
import { CalmOverlay } from '@/components/CalmOverlay'

import { HomeSurface } from '@/features/marketplace/HomeSurface'
import { DiscoverSurface } from '@/features/marketplace/DiscoverSurface'
import { ServerSurface } from '@/features/marketplace/ServerSurface'
import { PlaygroundSurface } from '@/features/playground/PlaygroundSurface'
import { PublishSurface } from '@/features/publish/PublishSurface'
import { ReviewQueueSurface } from '@/features/review/ReviewQueueSurface'
import { DocsSurface } from '@/features/docs/DocsSurface'

import type { SurfaceId } from '@/types'

const SURFACE_COMPONENTS: Record<SurfaceId, React.ComponentType> = {
  home: HomeSurface,
  discover: DiscoverSurface,
  server: ServerSurface,
  playground: PlaygroundSurface,
  publish: PublishSurface,
  review: ReviewQueueSurface,
  docs: DocsSurface,
}

const APP_HASHES = new Set(['home', 'discover', 'playground', 'server', 'publish', 'review', 'docs'])

function parseHash(): { surface: SurfaceId; serverId?: string } {
  const parts = window.location.hash.replace(/^#\/?/, '').split('/')
  const base = parts[0] ?? 'home'
  if (!APP_HASHES.has(base)) return { surface: 'home' }
  return { surface: base as SurfaceId, serverId: parts[1] ? decodeURIComponent(parts[1]) : undefined }
}

/**
 * The P31 MCP Marketplace — hash-routed surfaces:
 *   #/            → home (launcher)
 *   #/discover    → catalog grid
 *   #/server/:id  → server detail
 *   #/playground  → interactive playground session
 *   #/publish     → register a server
 *   #/docs        → integration guide
 */
export function App() {
  const surface = useWorkspaceStore((s) => s.surface)
  const setSurface = useWorkspaceStore((s) => s.setSurface)
  const refresh = useMarketplaceStore((s) => s.refresh)
  const loadMe = useMarketplaceStore((s) => s.loadMe)
  const [serverId, setServerId] = useState<string | undefined>()

  useKeyboardShortcuts()
  useSpoonDial()
  useThemeEffects()

  useEffect(() => {
    void refresh()
    void loadMe()
  }, [refresh, loadMe])

  useEffect(() => {
    const onHash = () => {
      const p = parseHash()
      setSurface(p.surface)
      setServerId(p.serverId)
      if (p.serverId) {
        void useMarketplaceStore.getState().loadServer(p.serverId).catch(() => {})
      }
    }
    window.addEventListener('hashchange', onHash)
    onHash()
    return () => window.removeEventListener('hashchange', onHash)
  }, [setSurface])

  const Surface = surface === 'server'
    ? () => <ServerSurface serverId={serverId} />
    : SURFACE_COMPONENTS[surface]

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Starfield />
      <NotificationStack />
      <Topbar />
      <div className="app-body">
        <SidebarNav />
        <main className="main-workspace" id="main-content">
          <Surface />
        </main>
      </div>
      <MobileBottomNav />
      <ModeGateModal />
      <CommandPalette />
      <CalmOverlay />
    </>
  )
}