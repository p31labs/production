/**
 * @file profile.ts — per-member profile resolution for the workspace portal.
 *
 * Pure + edge-safe (no imports, works in Workers, Node, browsers, tests).
 * A member's profile = deterministic roster defaults (pickle codename from
 * their stable slot seed) merged with their persisted customizations:
 * emoji, re-pickle seed, greeting name, accent, theme, spoons baseline.
 */

import { pickleName } from './pickleNames'
import type { ProfileOverride } from '@/store/workspaceStore'

/** The per-member accent palette — maps to `data-accent` slots. */
export const ACCENT_OPTIONS = [
  { id: 'cyan', label: 'Cyan', token: '--p31-accent-cyan' },
  { id: 'violet', label: 'Violet', token: '--p31-accent-violet' },
  { id: 'gold', label: 'Gold', token: '--p31-accent-gold' },
  { id: 'green', label: 'Green', token: '--p31-accent-green' },
  { id: 'red', label: 'Red', token: '--p31-accent-red' },
  { id: 'iris', label: 'Iris', token: '--p31-accent-iris' },
] as const

/** Family-friendly emoji picker set (whitelist, no PII). */
export const EMOJI_OPTIONS = ['🧸', '🛰️', '🌿', '🦉', '🫧', '🐢', '🌙', '🪷', '🔭', '🐚', '🫐', '🌾'] as const

export interface ResolvedProfile {
  id: string
  emoji: string
  pickleName: string
  monogram: string
  greetingName: string
  accent: string
  theme: { world: string; age: string; muted: boolean; warmLight: boolean }
  spoonsBaseline: number
}

/** Profile customization shape — mirrors the store's per-member override. */
export type ProfileOverrides = ProfileOverride

const DEFAULT_THEME = { world: 'aurora', age: 'adult', muted: false, warmLight: false }

/** Deterministic new pickle seed for a member (stable across renders). */
export function nextPickleSeed(id: string, version = 1): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0
  return `${id}-r${version}-${(h >>> 0).toString(36)}`
}

/** Merge roster defaults + a member's persisted overrides into a display profile. */
export function resolveProfile(
  id: string,
  baseEmoji: string,
  overrides?: ProfileOverrides,
): ResolvedProfile {
  const pickleSeed = overrides?.pickleSeed ?? id
  const name = pickleName(pickleSeed)
  const greetingName = overrides?.greetingName?.trim() || name
  return {
    id,
    emoji: overrides?.emoji ?? baseEmoji,
    pickleName: name,
    monogram: name.charAt(0),
    greetingName,
    accent: overrides?.accent ?? 'cyan',
    theme: { ...DEFAULT_THEME, ...overrides?.theme },
    spoonsBaseline: overrides?.spoonsBaseline ?? 4,
  }
}