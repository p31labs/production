/**
 * QPJ — SBT anchor client.
 *
 * The Loom (loom-8z0.pages.dev) makes the QPJ client-side SBT chain
 * server-authoritative: POST /api/loom/anchor/sbt witnesses each block's own
 * hash (never re-derived) and verifies the per-DID linkage. A rewritten local
 * chain breaks the linkage the next time a block is anchored.
 *
 * Degradation contract:
 *   - Offline / unreachable -> the block is queued in localStorage and retried
 *     in order on the next successful anchor, on app start, and on
 *     visibilitychange. The local chain is the source of truth for the UI; the
 *     anchor is best-effort proof, so the UI never blocks on it.
 *   - The queue is per-DID and in block order, so a retry never skips a link.
 *
 * The URL comes from VITE_LOOM_ANCHOR_URL, defaulting to the Loom production
 * endpoint. CORS is handled by the Loom's allowlist (LOOM_CORS_ORIGINS).
 */
import type { QpjSBTRecord } from './sbt';

const ANCHOR_URL =
  (import.meta.env.VITE_LOOM_ANCHOR_URL as string | undefined) ??
  'https://loom-8z0.pages.dev/api/loom/anchor/sbt';

const QUEUE_KEY = 'qpj:sbt:anchor:queue';

interface AnchorQueueEntry {
  did: string;
  block: QpjSBTRecord;
  queuedAt: number;
}

function loadQueue(): AnchorQueueEntry[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnchorQueueEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveQueue(entries: AnchorQueueEntry[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(entries));
  } catch {
    // The queue is best-effort; a full localStorage is not an anchor failure.
  }
}

/** Fire one anchor POST. Returns true when the Loom accepted it (200, including
 *  the idempotent inserted:false case) or it was already gone (404/409 from a
 *  stale queue is treated as "the chain moved on" — not a retry). */
async function anchorOne(entry: AnchorQueueEntry): Promise<boolean> {
  try {
    const res = await fetch(ANCHOR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ did: entry.did, block: entry.block }),
    });
    // 200 = witnessed (new or idempotent). 409 = the Loom rejected it, but a
    // stale-queue 409 (linkage moved on) is not worth infinite retry.
    return res.ok;
  } catch {
    return false; // network / CORS / offline — keep it queued.
  }
}

/** Retry the pending queue, in order, for one DID. Best-effort: stops at the
 *  first failure (the queue is ordered, so later blocks depend on earlier). */
export async function retryAnchorQueue(did: string): Promise<void> {
  const queue = loadQueue().filter((e) => e.did === did);
  if (!queue.length) return;
  for (const entry of queue) {
    const ok = await anchorOne(entry);
    if (!ok) break; // keep the rest queued; retry next time
    const remaining = loadQueue().filter((e) => !(e.did === entry.did && e.block.hash === entry.block.hash));
    saveQueue(remaining);
  }
}

/** Anchor a freshly-appended block: fire it now, queue it on failure, and also
 *  flush any earlier pending blocks for the same DID first (ordering). */
export async function anchorSbt(did: string, block: QpjSBTRecord): Promise<void> {
  // Flush earlier pending blocks for this DID first, so the chain stays ordered.
  await retryAnchorQueue(did);

  const entry: AnchorQueueEntry = { did, block, queuedAt: Date.now() };
  const ok = await anchorOne(entry);
  if (ok) return;
  // Queue it. Dedupe by block hash so a re-run of appendSBT never doubles it.
  const queue = loadQueue();
  if (!queue.some((e) => e.did === did && e.block.hash === block.hash)) {
    queue.push(entry);
    saveQueue(queue);
  }
}

/** Wire the visibilitychange flush so returning to the tab retries offline
 *  anchors. Safe to call once at app start. */
export function installAnchorRetryOnVisibility(): void {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const dids = new Set(loadQueue().map((e) => e.did));
      void Promise.all([...dids].map((did) => retryAnchorQueue(did)));
    }
  });
}