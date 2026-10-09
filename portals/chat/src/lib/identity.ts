import { generateDidKey, getOrCreateDid } from '@p31ca/sovereign-core/did';
import { getProfile, configure } from '@p31ca/sovereign-core/profile';

configure({ profilePrefix: 'p31-chat' });

export interface ChatIdentity {
  did: string;
  shortDid: string;
  name: string;
  emoji: string;
  accent: string;
}

const EMOJI_SET = ['🌱', '🔭', '🫧', '🌙', '⚡', '🌀', '🪐', '🌊'];
const ACCENT_SET = ['cyan', 'violet', 'gold', 'green', 'iris'] as const;

function hashSeed(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic pickle code-name (never a raw human name). Mirrors the
 *  workspace pickleNames doctrine: the same seed yields the same name. */
export function pickleName(seed: string): string {
  const rnd = mulberry32(hashSeed(seed));
  const a = ['ember', 'frost', 'willow', 'quill', 'solar', 'tide', 'cedar', 'nova', 'fern', 'lumen'];
  const b = ['keeper', 'weaver', 'warden', 'scout', 'pilot', 'builder', 'drifter', 'archivist'];
  const a2 = a[Math.floor(rnd() * a.length)];
  const b2 = b[Math.floor(rnd() * b.length)];
  return `${a2}-${b2}`;
}

export function shortDid(did: string): string {
  return did.length > 26 ? `${did.slice(0, 13)}…${did.slice(-9)}` : did;
}

/** Resolve (or lazily mint) the sovereign chat identity. First visit mints a
 *  real did:key (Ed25519) via sovereign-core; subsequent visits reuse it. */
export async function resolveChatIdentity(): Promise<ChatIdentity> {
  const did = await getOrCreateDid();
  const profile = getProfile();
  const seed = did;
  const rnd = mulberry32(hashSeed(seed));
  const emoji = EMOJI_SET[Math.floor(rnd() * EMOJI_SET.length)];
  const accent = ACCENT_SET[Math.floor(rnd() * ACCENT_SET.length)];
  const name = profile.name || pickleName(seed);
  return { did, shortDid: shortDid(did), name, emoji, accent };
}

export { generateDidKey };