/**
 * @file portalRouter.ts — the typed destination map for the P31 journey.
 *
 * Single source of truth for the hub cards, the wizard's step 5, and the
 * cross-portal JourneyNav. Every destination is a real, reachable portal
 * (verified live); the live dot only shows on destinations we've confirmed.
 */

export type PortalId = 'workspace' | 'qpj' | 'arcade' | 'chat' | 'passports'

export interface PortalDestination {
  id: PortalId
  label: string
  icon: string
  url: string
  description: string
  /** Verified reachable at build time. */
  live: boolean
  /** Mode badge — 'open' for anyone, 'caregiver' for gated surfaces. */
  access: 'open' | 'caregiver'
  /** Open in a new tab (external) or stay in-app (passports → workspace identity). */
  external: boolean
}

export const DESTINATIONS: PortalDestination[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    icon: '📄',
    url: 'https://workspace.p31ca.org/#/app',
    description: 'Docs, Sheets, Slides, Calendar, Mail, Drive, and the Forge — all local, all yours.',
    live: true,
    access: 'open',
    external: true,
  },
  {
    id: 'qpj',
    label: 'QPJ',
    icon: '💬',
    url: 'https://qpj.p31ca.org/#/home',
    description: 'The family companion — mesh, soulbound identity, love ledger.',
    live: true,
    access: 'open',
    external: true,
  },
  {
    id: 'arcade',
    label: 'Arcade',
    icon: '🎮',
    url: 'https://willow.p31ca.org/',
    description: 'Games and simulations — jitterbug, liquid, cards, strategy. Earn love.',
    live: true,
    access: 'open',
    external: true,
  },
  {
    id: 'chat',
    label: 'Chat',
    icon: '📡',
    url: 'https://chat.p31ca.org/',
    description: 'Family chat with the P31 community.',
    live: true,
    access: 'open',
    external: true,
  },
  {
    id: 'passports',
    label: 'Passports',
    icon: '🛂',
    url: 'https://workspace.p31ca.org/#/identity',
    description: 'Sovereign DIDs and soulbound tokens for every family member.',
    live: true,
    access: 'open',
    external: true,
  },
]

export function destinationFor(id: PortalId): PortalDestination {
  const d = DESTINATIONS.find((x) => x.id === id)
  if (!d) throw new Error(`No destination for "${id}"`)
  return d
}