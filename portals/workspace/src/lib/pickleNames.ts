/**
 * @file pickleNames.ts — the pickle code-name system for the workspace portal.
 *
 * A person is never shown a human name on any surface — pickle labels only.
 * The codename is deterministic: the same seed always yields the same name,
 * so the log, the family strip, and any agent-facing surface can name a
 * person without exposing the raw DID or a real name.
 *
 * Pure + edge-safe: no imports, no fs, works in Workers, Node, browsers, tests.
 * Mirrors @p31/canon/loom/codename.ts.
 */

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  }
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

/** Deterministic pickle codename from any stable seed (humanId / did / slot). */
export function pickleName(seed: string): string {
  const rng = mulberry32(hashStr(seed))
  const prefix = PREFIXES[Math.floor(rng() * PREFIXES.length)]!
  const suffix = SUFFIXES[Math.floor(rng() * SUFFIXES.length)]!
  return `${prefix} ${suffix.charAt(0).toUpperCase()}${suffix.slice(1)}`
}

/** A stable family roster keyed by an opaque slot id — the workspace's people. */
export interface PickleMember {
  id: string
  emoji: string
}

const ROSTER: PickleMember[] = [
  { id: 'caregiver-one', emoji: '🧸' },
  { id: 'caregiver-two', emoji: '🛰️' },
  { id: 'young-one', emoji: '🌿' },
]

export interface PicklePerson extends PickleMember {
  pickleName: string
  monogram: string
}

export function roster(): PicklePerson[] {
  return ROSTER.map((m) => ({
    ...m,
    pickleName: pickleName(m.id),
    monogram: pickleName(m.id).charAt(0),
  }))
}