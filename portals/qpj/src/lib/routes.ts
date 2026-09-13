import type { PortalMode } from './passports';

export type QpjRoute = 'entry' | 'street' | 'site' | 'worker' | 'talk' | 'you' | 'craft' | 'workshop' | 'switch';

export interface RouteSpec {
  hash: string;
  path: string;
  label: string;
  minMode: PortalMode;
}

export const ROUTES: Record<QpjRoute, RouteSpec> = {
  entry: { hash: '#/entry', path: '/entry', label: 'Entry', minMode: 'spark' },
  street: { hash: '#/street', path: '/street', label: 'Street', minMode: 'spark' },
  site: { hash: '#/site', path: '/site', label: 'Your site', minMode: 'spark' },
  worker: { hash: '#/worker', path: '/worker', label: 'Worker', minMode: 'spark' },
  talk: { hash: '#/talk', path: '/talk', label: 'Talk', minMode: 'spark' },
  you: { hash: '#/you', path: '/you', label: 'You', minMode: 'spark' },
  craft: { hash: '#/craft', path: '/craft', label: 'Craft', minMode: 'maker' },
  workshop: { hash: '#/workshop', path: '/workshop', label: 'Workshop', minMode: 'workshop' },
  switch: { hash: '#/switch', path: '/switch', label: 'Switch', minMode: 'spark' },
};

export const ROUTE_ORDER: QpjRoute[] = ['street', 'site', 'worker', 'talk', 'you', 'craft', 'workshop', 'switch', 'entry'];

export const DEFAULT_HASH = ROUTES.street.hash;

/** Sub-routes like #/workshop/tokens resolve to their parent route for the guard + shell. */
const SUB_ROUTED_PARENTS: QpjRoute[] = ['craft', 'workshop'];

function normalizeSubRoute(clean: string): string {
  for (const key of SUB_ROUTED_PARENTS) {
    if (clean === ROUTES[key].path || clean.startsWith(`${ROUTES[key].path}/`)) {
      return ROUTES[key].path;
    }
  }
  return clean;
}

export function hashToPath(hash: string): string {
  const clean = hash.replace(/^#/, '') || ROUTES.street.path;
  return normalizeSubRoute(clean);
}

export function routeForPath(path: string): QpjRoute {
  const found = (Object.keys(ROUTES) as QpjRoute[]).find(
    (key) => ROUTES[key].path === normalizeSubRoute(path),
  );
  return found ?? 'street';
}

export function navigateTo(route: QpjRoute): void {
  if (typeof window !== 'undefined') {
    window.location.hash = ROUTES[route].hash;
  }
}