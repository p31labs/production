export type SurfaceId = 'home' | 'discover' | 'server' | 'playground' | 'publish' | 'docs' | 'review'

export interface RouteDef {
  id: SurfaceId
  path: string
  label: string
  icon: string
  badge: 'spark' | 'maker' | 'workshop'
  requiresMode?: 'maker' | 'workshop'
}

export const ROUTES: RouteDef[] = [
  { id: 'home', path: '/', label: 'Home', icon: '🏠', badge: 'spark' },
  { id: 'discover', path: '/discover', label: 'Discover', icon: '🧩', badge: 'spark' },
  { id: 'playground', path: '/playground', label: 'Playground', icon: '🛠️', badge: 'maker' },
  { id: 'server', path: '/server/:id', label: 'Server', icon: '🖥️', badge: 'spark' },
  { id: 'publish', path: '/publish', label: 'Publish', icon: '📤', badge: 'maker', requiresMode: 'maker' },
  { id: 'review', path: '/review', label: 'Review', icon: '🔍', badge: 'workshop', requiresMode: 'workshop' },
  { id: 'docs', path: '/docs', label: 'Docs', icon: '📖', badge: 'spark' },
]

export function routeFor(surface: SurfaceId): RouteDef {
  const r = ROUTES.find((x) => x.id === surface)
  if (!r) throw new Error(`No route for ${surface}`)
  return r
}