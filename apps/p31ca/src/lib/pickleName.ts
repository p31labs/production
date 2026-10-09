/**
 * @file pickleName.ts — deterministic pickle codename generator.
 *
 * Mirrors the workspace portal's pickleNames.ts so the same slot id always
 * resolves to the same codename across the hub and every portal. Pure and
 * edge-safe (no imports, works in Workers, Node, browsers, tests).
 */

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const PREFIXES = [
  'Dill', 'Bread', 'Corn', 'Gherkin', 'Half', 'Sour',
  'Jar', 'Brine', 'Ferment', 'Crisp', 'Tang', 'Salt',
  'Pickle', 'Snap', 'Crunch', 'Sweet', 'Seed', 'Rind',
]

const SUFFIXES = [
  'ember', 'dawn', 'lark', 'sharp', 'little', 'soft', 'cultch',
  'pearl', 'moss', 'fern', 'stone', 'mist', 'willow', 'birch',
]

export function pickleName(seed: string): string {
  const rng = mulberry32(hashStr(seed))
  const prefix = PREFIXES[Math.floor(rng() * PREFIXES.length)]!
  const suffix = SUFFIXES[Math.floor(rng() * SUFFIXES.length)]!
  return `${prefix} ${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`
}

export interface MemberSlot {
  id: string
  emoji: string
}

/** The hub's roster — mirrors the workspace portal roster. */
export const ROSTER: MemberSlot[] = [
  { id: 'caregiver-one', emoji: '🧸' },
  { id: 'caregiver-two', emoji: '🛰️' },
  { id: 'young-one', emoji: '🌿' },
]