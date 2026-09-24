/**
 * @file sbt-anchor.ts — Loom SBT anchor client.
 *
 * The Loom (loom-8z0.pages.dev) makes the client-side SBT chain server-
 * authoritative: POST /api/loom/anchor/sbt witnesses each block's own hash
 * (never re-derived) and verifies the per-DID linkage. Degrades to a local
 * pending queue when the anchor is unreachable — the chain still appends,
 * and the next successful anchor flushes the queue.
 */

const ANCHOR_URL = 'https://loom-8z0.pages.dev/api/loom/anchor/sbt'
const QUEUE_KEY = 'p31:sbt-anchor-queue'

export interface AnchorPayload {
  did: string
  blockHash: string
  prevHash: string
  title: string
  mintedAt: number
}

function loadQueue(): AnchorPayload[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as AnchorPayload[]) : []
  } catch {
    return []
  }
}

function saveQueue(q: AnchorPayload[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
  } catch {
    /* storage unavailable */
  }
}

/** Best-effort anchor. Returns the on-chain tokenId or null (queued). */
export async function anchorSbt(payload: AnchorPayload): Promise<string | null> {
  try {
    const res = await fetch(ANCHOR_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) throw new Error(`anchor ${res.status}`)
    const data = (await res.json()) as { tokenId?: string }
    return data.tokenId ?? null
  } catch {
    const queue = loadQueue()
    queue.push(payload)
    saveQueue(queue)
    return null
  }
}

/** Flush any queued anchors (called on app focus / reconnect). Returns count. */
export async function flushAnchorQueue(): Promise<number> {
  const queue = loadQueue()
  if (queue.length === 0) return 0
  const remaining: AnchorPayload[] = []
  let anchored = 0
  for (const payload of queue) {
    const tokenId = await anchorSbt(payload)
    if (tokenId) anchored += 1
    else remaining.push(payload)
  }
  saveQueue(remaining)
  return anchored
}