/**
 * loom-backup — daily D1 → R2 cold storage for the audit chains.
 *
 * An append-only hash-chained log without a tested restore is a paper chain.
 * This Worker snapshots BOTH chains (events + refusals) to R2 every night at
 * 03:00 UTC. Each row is written as its ChainRecord view in the SAME JCS
 * canonical form the chains commit to, so a downstream verifier can run
 * @p31ca/canon's verifyChain directly on the restored rows. The anchor line
 * carries the TRUE head (hashRecord of the last row — not the last row's
 * prev_hash, which points one step back).
 *
 * Retention: keys older than 30 days are pruned using each object's `uploaded`
 * timestamp (not the worker's clock), with cursor pagination.
 */
import { canonicalize, hashRecord, type ChainRecord } from '@p31ca/canon/loom/hash-chain';

const RETENTION_DAYS = 30;

interface EventRow { seq: number; ts: string; data: string; prev_hash: string; scope: string; }
interface RefusalRow { seq: number; ts: string; mode: string; session: string; agent: string; kind: string; node: string; reason: string; prev_hash: string; }

/** The refusal chain's canonical data — the same payload recordRefusal commits. */
function refusalData(r: RefusalRow): string {
  return canonicalize({ mode: r.mode, session: r.session, agent: r.agent, kind: r.kind, node: r.node, reason: r.reason });
}

async function runBackup(env: Env): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const key = `loom-${today}.jsonl`;
  const events = await env.LOOM_D1.prepare('SELECT seq, ts, data, prev_hash, scope FROM events ORDER BY seq ASC').all<EventRow>();
  const refusals = await env.LOOM_D1.prepare('SELECT seq, ts, mode, session, agent, kind, node, reason, prev_hash FROM refusals ORDER BY seq ASC').all<RefusalRow>();

  // ChainRecord views — the same shape verifyChain consumes.
  const eventRecords: ChainRecord[] = (events.results ?? []).map((r) => ({ seq: r.seq, ts: r.ts, data: r.data, prev_hash: r.prev_hash }));
  const refusalRecords: ChainRecord[] = (refusals.results ?? []).map((r) => ({ seq: r.seq, ts: r.ts, data: refusalData(r), prev_hash: r.prev_hash }));

  // The TRUE head: the hash of the last record (prev_hash of the last row is
  // the link one step back, not the head).
  const headEvents = eventRecords.length ? await hashRecord(eventRecords[eventRecords.length - 1]) : '';
  const headRefusals = refusalRecords.length ? await hashRecord(refusalRecords[refusalRecords.length - 1]) : '';

  const lines: string[] = [];
  lines.push(canonicalize({ anchor: 'loom-backup', date: today, events: eventRecords.length, refusals: refusalRecords.length, headEvents, headRefusals }));
  for (const r of eventRecords) lines.push(canonicalize({ chain: 'events', row: r }));
  for (const r of refusalRecords) lines.push(canonicalize({ chain: 'refusals', row: r }));

  await env.LOOM_BACKUPS.put(key, lines.join('\n') + '\n', { httpMetadata: { contentType: 'application/x-ndjson' } });

  // Prune by the object's own uploaded timestamp (backfilled/restored objects
  // must not be pruned by the worker's clock), with cursor pagination.
  const cutoff = Date.now() - RETENTION_DAYS * 86400_000;
  let cursor: string | undefined;
  do {
    const listed = await env.LOOM_BACKUPS.list(cursor ? { cursor } : {});
    for (const obj of listed.objects) {
      if (obj.key.startsWith('loom-') && obj.uploaded.getTime() < cutoff) await env.LOOM_BACKUPS.delete(obj.key);
    }
    cursor = listed.cursor;
  } while (cursor);

  console.log(`[backup] ${key}: ${eventRecords.length} events, ${refusalRecords.length} refusals, headEvents ${headEvents.slice(0, 16)}…`);
}

export default {
  async scheduled(_controller: ScheduledController, env: Env): Promise<void> {
    try {
      await runBackup(env);
    } catch (e) {
      console.error('[backup] failed', String(e));
      throw e;
    }
  },
};

interface Env {
  LOOM_D1: D1Database;
  LOOM_BACKUPS: R2Bucket;
}