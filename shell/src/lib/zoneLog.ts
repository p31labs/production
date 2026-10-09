import { getDB } from './db';
import { ensureDid } from './memory';
import type { PGlite } from '@electric-sql/pglite';

export interface ZoneAccessLogEntry {
  zoneId: string;
  kind?: 'enter' | 'exit' | 'acknowledge';
  payload?: Record<string, unknown>;
}

export interface ZoneAccessLogOptions {
  db?: PGlite;
  actorDid?: string;
}

function uid(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `zone-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function writeZoneAccessLog(entry: ZoneAccessLogEntry, opts?: ZoneAccessLogOptions): Promise<void> {
  const db = opts?.db ?? (await getDB());
  const did = opts?.actorDid ?? (await ensureDid().catch(() => 'SYSTEM'));
  await db.query(
    `INSERT INTO zone_access_log (id, zone_id, actor_did, kind, payload, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [uid(), entry.zoneId, did, entry.kind ?? 'enter', JSON.stringify(entry.payload ?? {}), Date.now()],
  );
}
