/**
 * @file sbt.ts — soulbound token chain for the workspace portal.
 *
 * A hash-chained, per-member append-only log of soulbound tokens (SBTs).
 * Each block stores the previous block's hash, so a tampered local chain
 * breaks linkage on the next anchor. Ported from QPJ's sbt.ts.
 */

export type SBTKind = 'achievement' | 'credential' | 'affiliation' | 'guardian'

export interface SBT {
  id: string
  kind: SBTKind
  title: string
  description: string
  memberId: string
  did: string
  mintedAt: number
  prevHash: string
  hash: string
  onChainTokenId?: string
  anchorStatus: 'local' | 'pending' | 'anchored'
}

const SBT_PREFIX = 'p31:sbt:'

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

interface SbtDraft {
  id: string
  kind: SBTKind
  title: string
  memberId: string
  did: string
  mintedAt: number
  prevHash: string
}

/** Compute a block's hash from its content + the previous hash. */
export async function computeSbtHash(sbt: SbtDraft): Promise<string> {
  const payload = JSON.stringify({
    id: sbt.id,
    kind: sbt.kind,
    title: sbt.title,
    memberId: sbt.memberId,
    did: sbt.did,
    mintedAt: sbt.mintedAt,
    prevHash: sbt.prevHash,
  })
  return sha256Hex(payload)
}

/** Load a member's SBT chain (ordered oldest-first). */
export function loadSbtChain(memberId: string): SBT[] {
  try {
    const raw = localStorage.getItem(`${SBT_PREFIX}${memberId}`)
    return raw ? (JSON.parse(raw) as SBT[]) : []
  } catch {
    return []
  }
}

function saveSbtChain(memberId: string, chain: SBT[]): void {
  try {
    localStorage.setItem(`${SBT_PREFIX}${memberId}`, JSON.stringify(chain))
  } catch {
    /* storage unavailable */
  }
}

/** Append a new SBT to a member's chain (returns the minted record). */
export async function appendSBT(
  memberId: string,
  did: string,
  kind: SBTKind,
  title: string,
  description: string,
): Promise<SBT> {
  const chain = loadSbtChain(memberId)
  const prevHash = chain.length > 0 ? chain[chain.length - 1]!.hash : 'genesis'
  const draft: SbtDraft = {
    id: `sbt-${memberId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title,
    memberId,
    did,
    mintedAt: Date.now(),
    prevHash,
  }
  const hash = await computeSbtHash(draft)
  const sbt: SBT = {
    ...draft,
    description,
    hash,
    anchorStatus: 'local',
  }
  saveSbtChain(memberId, [...chain, sbt])
  return sbt
}

/** Verify a member's chain integrity (every prevHash links correctly). */
export async function verifySbtChain(memberId: string): Promise<boolean> {
  const chain = loadSbtChain(memberId)
  let prev = 'genesis'
  for (const sbt of chain) {
    if (sbt.prevHash !== prev) return false
    const expected = await computeSbtHash(sbt)
    if (expected !== sbt.hash) return false
    prev = sbt.hash
  }
  return true
}

/** Idempotent membership check by title. */
export function hasSbt(memberId: string, title: string): boolean {
  return loadSbtChain(memberId).some((s) => s.title === title)
}

/** Mark a pending/local token as anchored with a real on-chain tokenId. */
export function markSbtAnchored(memberId: string, id: string, tokenId: string): void {
  const chain = loadSbtChain(memberId)
  const next = chain.map((s) =>
    s.id === id ? { ...s, onChainTokenId: tokenId, anchorStatus: 'anchored' as const } : s,
  )
  saveSbtChain(memberId, next)
}