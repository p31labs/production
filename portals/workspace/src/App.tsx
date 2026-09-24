import { useEffect, useState } from 'react'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useSpoonDial } from '@/hooks/useSpoonDial'
import { useThemeEffects } from '@/hooks/useThemeEffects'
import { useSBT } from '@/hooks/useSBT'

import { Starfield } from '@/components/Starfield'
import { NotificationStack } from '@/components/NotificationStack'
import { Topbar } from '@/components/Topbar'
import { SidebarNav } from '@/components/SidebarNav'
import { MobileBottomNav } from '@/components/MobileBottomNav'
import { ModeGateModal } from '@/components/ModeGateModal'
import { CommandPalette } from '@/components/CommandPalette'
import { CalmOverlay } from '@/components/CalmOverlay'
import { SettingsSurface } from '@/features/settings/SettingsSurface'
import { DevMenu } from '@/features/dev/DevMenu'

import { HomeSurface } from '@/features/home/HomeSurface'
import { DocsSurface } from '@/features/docs/DocsSurface'
import { SheetsSurface } from '@/features/sheets/SheetsSurface'
import { SlidesSurface } from '@/features/slides/SlidesSurface'
import { CalendarSurface } from '@/features/calendar/CalendarSurface'
import { MailSurface } from '@/features/mail/MailSurface'
import { DriveSurface } from '@/features/drive/DriveSurface'
import { ProfileSurface } from '@/features/profile/ProfileSurface'
import { IdentitySurface } from '@/features/identity/IdentitySurface'
import { LandingPage } from '@/features/landing/LandingPage'

import type { SurfaceId } from '@/types'

const SURFACE_COMPONENTS: Record<SurfaceId, React.ComponentType> = {
  home: HomeSurface,
  docs: DocsSurface,
  sheets: SheetsSurface,
  slides: SlidesSurface,
  calendar: CalendarSurface,
  mail: MailSurface,
  drive: DriveSurface,
  profile: ProfileSurface,
  identity: IdentitySurface,
}

const APP_HASHES = new Set(['app', 'home', 'docs', 'sheets', 'slides', 'calendar', 'mail', 'drive', 'profile', 'identity', 'setup'])

/** Parse the current hash into the app layer (boolean) + surface id. */
function parseHash(): { inApp: boolean; surface: SurfaceId | null } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const base = raw.split('/')[0] ?? ''
  if (base === 'setup') return { inApp: true, surface: null }
  if (!APP_HASHES.has(base)) return { inApp: false, surface: null }
  if (base === 'app') return { inApp: true, surface: 'home' }
  return { inApp: true, surface: base as SurfaceId }
}

/**
 * The portal serves two layers:
 *   - `#/` or no hash  → the landing (front door)
 *   - `#/app`          → the standalone workspace app
 *   - `#/<surface>`    → a deep surface link
 *   - `#/setup`        → the caregiver setup + integration surface
 *
 * The hash is read into React state and re-evaluated on every hashchange,
 * so clicking "Enter the workspace" (#/app) navigates live — no refresh.
 */
export function App() {
  const surface = useWorkspaceStore((s) => s.surface)
  const [inApp, setInApp] = useState(() => parseHash().inApp)
  useKeyboardShortcuts()
  useSpoonDial()
  useThemeEffects()
  useSBT()

  useEffect(() => {
    const onHashChange = () => {
      const parsed = parseHash()
      setInApp(parsed.inApp)
      if (parsed.surface) {
        useWorkspaceStore.getState().setSurface(parsed.surface)
      }
    }
    window.addEventListener('hashchange', onHashChange)
    // Initial read (covers direct deep links + refresh).
    onHashChange()
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (!inApp) return <LandingPage />

  const hashBase = window.location.hash.replace(/^#\/?/, '').split('/')[0] ?? ''
  if (hashBase === 'setup') return <SettingsSurface />

  const Surface = SURFACE_COMPONENTS[surface]

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Starfield />
      <NotificationStack />
      <DevMenu />
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