/**
 * api/artifacts/schema.ts — the shared-artifact table, created on demand.
 *
 * The durable tier's bytes live in a D1 row (the ledger event carries only the
 * content hash, per the feature's rule 4). `CREATE ... IF NOT EXISTS` keeps the
 * Function working on a database where `wrangler d1 migrations apply` has not
 * run yet; migrations/0002_shared_artifacts.sql is the same schema for the
 * migrated path.
 */
import type { Env } from '../../_lib/ledger';

export const SHARED_ARTIFACTS_DDL = `CREATE TABLE IF NOT EXISTS shared_artifacts (
  share_id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  artifact_key TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  author_did TEXT NOT NULL DEFAULT '',
  retention_secs INTEGER NOT NULL DEFAULT 86400,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
)`;

export async function ensureSharedArtifacts(env: Env): Promise<void> {
  await env.DB.prepare(SHARED_ARTIFACTS_DDL).run();
}

export interface SharedArtifactRow {
  share_id: string;
  session_id: string;
  artifact_key: string;
  kind: string;
  title: string;
  content: string;
  content_hash: string;
  author_did: string;
  retention_secs: number;
  created_at: number;
  expires_at: number;
}

/** The default retention window: 7 days. */
export const DEFAULT_RETENTION_SECS = 7 * 24 * 60 * 60;

/** Clamp a requested retention to [1 hour, 30 days]. */
export function clampRetention(secs: unknown): number {
  const n = typeof secs === 'number' && Number.isFinite(secs) ? Math.floor(secs) : DEFAULT_RETENTION_SECS;
  return Math.min(30 * 24 * 60 * 60, Math.max(60 * 60, n));
}
