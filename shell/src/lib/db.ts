/**
 * PGLite database singleton for the P31 Sovereign Shell.
 * Uses IndexedDB persistence via `dataDir: 'idb://...'`.
 * Without a dataDir PGLite runs in-memory and data is lost on refresh.
 */

import type { PGlite } from '@electric-sql/pglite';
import type { LedgerEntry } from '@p31ca/economy';

const DB_NAME = 'idb://p31-shell';

let _instance: PGlite | null = null;

export async function getDB(): Promise<PGlite> {
  if (_instance) return _instance;

  const { PGlite } = await import('@electric-sql/pglite');

  let extensions = {};
  try {
    const { vector } = await import('@electric-sql/pglite-pgvector');
    extensions = { vector };
  } catch {
    // pgvector extension not installed — embeddings features will be unavailable
  }

  _instance = new PGlite(DB_NAME, { extensions });
  await _instance.ready;
  return _instance;
}

export function getDBSync(): PGlite | null {
  return _instance;
}

export async function getEmbeddingCorpusStats(): Promise<{
  total: number;
  oldest?: number;
  newest?: number;
  avgLength?: number;
}> {
  try {
    const db = await getDB();
    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*) as total FROM embeddings`,
    );
    const count = parseInt(countResult.rows[0]?.total ?? '0', 10);

    if (count === 0) return { total: 0 };

    const rangeResult = await db.query<{ oldest: number; newest: number }>(
      `SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM embeddings`,
    );
    const { oldest, newest } = rangeResult.rows[0] ?? {};

    const avgResult = await db.query<{ avg_length: string }>(
      `SELECT AVG(LENGTH(content)) as avg_length FROM embeddings`,
    );
    const avgLength = parseFloat(avgResult.rows[0]?.avg_length ?? '0');

    return {
      total: count,
      oldest: oldest ?? undefined,
      newest: newest ?? undefined,
      avgLength: Number.isFinite(avgLength) ? Math.round(avgLength) : undefined,
    };
  } catch {
    return { total: 0 };
  }
}

export async function storeBatchEmbeddings(items: Array<{ id: string; content: string; embedding: number[] }>): Promise<void> {
  const db = await getDB();
  try {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.query(
          'INSERT OR REPLACE INTO embeddings (id, content, embedding, created_at) VALUES (?, ?, ?, ?)',
          [item.id, item.content, item.embedding, Date.now()],
        );
      }
    });
  } catch (error) {
    console.error('[Embedding] Batch storage failed:', error);
  }
}

export async function reindexEmbeddings(): Promise<void> {
  const db = await getDB();
  const stats = await getEmbeddingCorpusStats();
  let lists = 16;
  if (stats.total > 1000) {
    lists = Math.max(16, Math.floor(Math.sqrt(stats.total)));
  }
  lists = Math.min(lists, 1000);

  try { await db.exec('REINDEX INDEX idx_embeddings_cosine'); } catch { /* index may not exist yet */ }
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_embeddings_cosine
      ON embeddings USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = ${lists})
  `);
}

export async function closeDB(): Promise<void> {
  if (!_instance) return;
  await _instance.close();
  _instance = null;
}

export async function getLedgerForToday(did: string): Promise<LedgerEntry[]> {
  const db = await getDB();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const res = await db.query<LedgerEntry>(
    `SELECT id, actor_did, entry_type, payload, created_at
     FROM ledger
     WHERE actor_did = $1 AND created_at >= $2
     ORDER BY created_at ASC`,
    [did, start.getTime()],
  );
  return res.rows;
}

export async function runMigrations(db: PGlite): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id TEXT PRIMARY KEY,
      actor_did TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
    );

    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      tier TEXT NOT NULL DEFAULT 'global',
      rule_text TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
    );

    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      energy TEXT NOT NULL DEFAULT 'balanced',
      parent_id TEXT,
      created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
    );

    CREATE TABLE IF NOT EXISTS zone_access_log (
      id TEXT PRIMARY KEY,
      zone_id TEXT NOT NULL,
      actor_did TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'enter',
      payload TEXT NOT NULL DEFAULT '{}',
      created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at BIGINT NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint,
      attempts INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      last_attempt_at BIGINT
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox(status) WHERE status = 'pending';

    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding FLOAT4[384] NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (extract(epoch from now()) * 1000)::bigint
    );
    -- Auto-tune ivfflat lists based on corpus size:
    --   sqrt(rows) gives roughly equal-sized clusters; capped at 1000 to keep build time reasonable.
    --   For < 1000 rows the minimum of 16 avoids over-partitioning a small corpus.
    --   Call reindexEmbeddings() to rebuild with updated lists as the corpus grows.
  `);
  try {
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_embeddings_cosine
        ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 16)
    `);
  } catch {
    // pgvector extension not loaded — index will be created when extension is available
  }
}
