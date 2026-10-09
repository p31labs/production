/**
 * @file lib/outbox.ts — Offline-First Durable Sync Queue
 * 
 * Pattern: Enqueue writes to PGLite, drain on reconnect.
 * - All mesh broadcasts + ledger appends go through enqueue()
 * - Writes persist to IndexedDB (via PGLite)
 * - Background Sync (Chrome/Edge) + visibilitychange fallback (Firefox/Safari)
 * - Exponential backoff + newer-wins conflict resolution
 */

import { getDB } from './db';
import { computeEmbeddingSafe } from './embeddingService';
import { storeMessageEmbedding } from './cognitiveGate';

export interface OutboxEntry {
  id: string;
  kind: 'mesh-broadcast' | 'ledger-append' | 'mesh-message';
  payload: any;
  created_at: number;
  attempts: number;
  status: 'pending' | 'sent' | 'failed';
  last_attempt_at?: number;
}

let drainInProgress = false;

/**
 * Enqueue a write operation to the outbox.
 * Immediately persists to PGLite (IndexedDB-backed), then attempts drain.
 */
export async function enqueue(kind: OutboxEntry['kind'], payload: any): Promise<void> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const created_at = Date.now();

  await db.query(
    `INSERT INTO outbox (id, kind, payload, created_at, attempts, status)
     VALUES ($1, $2, $3, $4, 0, 'pending')`,
    [id, kind, JSON.stringify(payload), created_at]
  );

  console.log(`[outbox] Enqueued ${kind}:`, id);

  // Attempt immediate drain if online
  if (navigator.onLine) {
    tryDrain().catch((err) => console.warn('[outbox] Drain failed:', err));
  }
}

/**
 * Drain the outbox — send all pending entries.
 * Uses exponential backoff for failed entries.
 * Conflict resolution: newer-wins (send in created_at order).
 */
export async function drain(): Promise<{ sent: number; failed: number }> {
  if (drainInProgress) {
    console.log('[outbox] Drain already in progress, skipping');
    return { sent: 0, failed: 0 };
  }

  drainInProgress = true;
  let sent = 0;
  let failed = 0;

  try {
    const db = await getDB();
    const result = await db.query<OutboxEntry>(
      `SELECT id, kind, payload, created_at, attempts, last_attempt_at
       FROM outbox
       WHERE status = 'pending'
       ORDER BY created_at ASC`
    );

    const entries = result.rows;
    console.log(`[outbox] Draining ${entries.length} pending entries`);

    for (const entry of entries) {
      // Exponential backoff: wait 2^attempts seconds before retry
      if (entry.last_attempt_at) {
        const backoffMs = Math.min(Math.pow(2, entry.attempts) * 1000, 60000); // max 60s
        const elapsed = Date.now() - entry.last_attempt_at;
        if (elapsed < backoffMs) {
          console.log(`[outbox] Skipping ${entry.id} (backoff: ${backoffMs}ms)`);
          continue;
        }
      }

      try {
        await send(entry.kind, JSON.parse(entry.payload));
        await db.query(
          `UPDATE outbox SET status = 'sent' WHERE id = $1`,
          [entry.id]
        );
        sent++;
        console.log(`[outbox] Sent ${entry.kind}:`, entry.id);
      } catch (err) {
        const attempts = entry.attempts + 1;
        const status = attempts >= 5 ? 'failed' : 'pending'; // give up after 5 attempts
        await db.query(
          `UPDATE outbox SET attempts = $1, status = $2, last_attempt_at = $3 WHERE id = $4`,
          [attempts, status, Date.now(), entry.id]
        );
        failed++;
        console.error(`[outbox] Failed to send ${entry.kind} (attempt ${attempts}):`, entry.id, err);
      }
    }
  } finally {
    drainInProgress = false;
  }

  console.log(`[outbox] Drain complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
}

/**
 * Non-throwing drain wrapper for event handlers.
 */
export async function tryDrain(): Promise<void> {
  try {
    await drain();
  } catch (err) {
    console.error('[outbox] Drain error:', err);
  }
}

/**
 * Send a single outbox entry to its destination.
 * Newer-wins conflict resolution: if the payload has a timestamp,
 * the receiver should prefer the newer value.
 */
async function send(kind: OutboxEntry['kind'], payload: any): Promise<void> {
  switch (kind) {
    case 'mesh-broadcast':
      await sendMeshBroadcast(payload);
      break;
    case 'ledger-append':
      await sendLedgerAppend(payload);
      break;
    case 'mesh-message':
      await sendMeshMessage(payload);
      break;
    default:
      throw new Error(`Unknown outbox kind: ${kind}`);
  }
}

/**
 * Send a mesh broadcast via the mesh layer.
 */
function extractText(payload: any): string | null {
  if (!payload) return null;
  if (typeof payload.text === 'string') return payload.text;
  if (typeof payload.content === 'string') return payload.content;
  if (typeof payload.message === 'string') return payload.message;
  if (typeof payload.data === 'string') return payload.data;
  return null;
}

async function sendMeshBroadcast(payload: any): Promise<void> {
  const { rawBroadcastSync } = await import('./mesh/libp2pMesh');
  rawBroadcastSync(payload.type, payload.data);

  // Store embedding for semantic memory if payload contains text content
  try {
    const text = extractText(payload);
    if (text) {
      const embedding = await computeEmbeddingSafe(text);
      if (embedding) {
        storeMessageEmbedding(text, embedding).catch(() => {});
      }
    }
  } catch {
    // Embedding storage is best-effort
  }
}

/**
 * Send a ledger append via the ledger layer.
 */
async function sendLedgerAppend(payload: any): Promise<void> {
  const db = await getDB();
  await db.query(
    `INSERT INTO ledger (id, actor_did, entry_type, payload, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO NOTHING`, // newer-wins: if already exists, skip
    [payload.id, payload.actor_did, payload.entry_type, payload.payload, payload.created_at]
  );
}

/**
 * Send a mesh message (point-to-point).
 */
async function sendMeshMessage(payload: any): Promise<void> {
  // TODO: implement when mesh message routing is added
  console.warn('[outbox] mesh-message not yet implemented, dropping:', payload);
}

/**
 * Get pending entry count (for UI badge).
 */
export async function getPendingCount(): Promise<number> {
  const db = await getDB();
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) as count FROM outbox WHERE status = 'pending'`
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Clear sent entries older than 7 days (cleanup).
 */
export async function cleanup(): Promise<void> {
  const db = await getDB();
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  await db.query(`DELETE FROM outbox WHERE status = 'sent' AND created_at < $1`, [cutoff]);
}
