import type { SurfaceId } from '@/types'

export interface RouteDef {
  id: SurfaceId
  path: string
  label: string
  icon: string
  badge: 'spark' | 'maker' | 'workshop'
  requiresMode?: 'maker' | 'workshop'
}

export const ROUTES: RouteDef[] = [
  { id: 'home', path: '/', label: 'Home / Launcher', icon: '🏠', badge: 'spark' },
  { id: 'docs', path: '/docs', label: 'Docs', icon: '📄', badge: 'spark' },
  { id: 'sheets', path: '/sheets', label: 'Sheets', icon: '📊', badge: 'maker', requiresMode: 'maker' },
  { id: 'slides', path: '/slides', label: 'Slides', icon: '📽️', badge: 'maker', requiresMode: 'maker' },
  { id: 'calendar', path: '/calendar', label: 'Calendar', icon: '📅', badge: 'spark' },
  { id: 'mail', path: '/mail', label: 'Mail', icon: '✉️', badge: 'spark' },
  { id: 'drive', path: '/drive', label: 'Drive', icon: '📁', badge: 'maker', requiresMode: 'maker' },
  { id: 'profile', path: '/profile', label: 'Profile', icon: '🎭', badge: 'spark' },
  { id: 'identity', path: '/identity', label: 'Passports', icon: '🛂', badge: 'spark' },
]

export function routeFor(surface: SurfaceId): RouteDef {
  const r = ROUTES.find((x) => x.id === surface)
  if (!r) throw new Error(`No route for ${surface}`)
  return r
}