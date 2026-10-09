/**
 * The music maker — shared D1-backed log adapter.
 *
 * Extracted from index.ts so BOTH Durable Objects (MusicRoom for composition,
 * ControlRoom for control config) commit through the SAME canon ReplayGate +
 * hash-chain path. A Durable Object cannot call the canon's Node commit()
 * (node:fs); this adapter mirrors the Loom's D1 appendEvent — fold existing
 * rows through the gate, append the new input, stamp the hash-chain link.
 * O(log length).
 *
 * One shared truth: every committed event — instrument.zone.* and control.* —
 * lives in the `events` table, gate-validated, seq-stamped, hash-chained. The
 * ControlRoom's in-memory routing table is a CACHE of the log, not a second
 * truth (see controlRoom.ts).
 */

import { ReplayGate, normalizeLegacyScope, type LoomEventInput } from '@p31ca/canon/loom/gate';
import type { LoomEvent } from '@p31ca/canon/loom/events';
import { hashRecord, GENESIS_PREV_HASH, type ChainRecord } from '@p31ca/canon/loom/hash-chain';

/** The minimal env the log adapter needs — both DOs' env satisfy it. */
export interface LogEnv {
  MUSIC_D1: D1Database;
}

interface MusicRecord extends ChainRecord {
  scope: 'personal' | 'shared' | 'session';
}

export async function readRecords(env: LogEnv): Promise<MusicRecord[]> {
  const { results } = await env.MUSIC_D1.prepare(
    'SELECT seq, ts, data, prev_hash, scope FROM events ORDER BY seq ASC',
  ).all<{ seq: number; ts: string; data: string; prev_hash: string; scope: string }>();
  return (results ?? []).map((r) => ({
    seq: r.seq,
    ts: r.ts,
    data: r.data,
    prev_hash: r.prev_hash ?? GENESIS_PREV_HASH,
    scope: (r.scope ?? 'shared') as MusicRecord['scope'],
  }));
}

export async function readEvents(env: LogEnv): Promise<LoomEvent[]> {
  const records = await readRecords(env);
  return records.map((r) => {
    const e = JSON.parse(r.data) as LoomEvent;
    return { ...e, seq: r.seq, ts: r.ts };
  });
}

/** Gate-validate and append one committed event to the D1 log. Throws on
 *  rejection (the caller surfaces { valid:false, error }). */
export async function appendEvent(env: LogEnv, input: LoomEventInput): Promise<LoomEvent> {
  const gate = new ReplayGate();
  const existing = await readRecords(env);
  for (const r of existing) {
    const e = JSON.parse(r.data) as LoomEventInput;
    const rr = gate.append(normalizeLegacyScope(e));
    if (!rr.valid) throw new Error(`replay rejected existing event: ${rr.error}`);
  }
  const result = gate.append(input);
  if (!result.valid) throw new Error(`gate rejected ${input.kind}: ${result.error}`);
  const log = gate.getLog();
  const event = log[log.length - 1];
  const head = existing.length ? await hashRecord(existing[existing.length - 1]) : GENESIS_PREV_HASH;
  const scope = 'scope' in event && event.scope ? event.scope : 'shared';
  await env.MUSIC_D1.prepare('INSERT INTO events (seq, ts, data, prev_hash, scope) VALUES (?, ?, ?, ?, ?)')
    .bind(event.seq, event.ts, JSON.stringify(event), head, scope)
    .run();
  return event;
}