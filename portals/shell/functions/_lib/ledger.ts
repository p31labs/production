/**
 * _lib/ledger.ts — the hash-chained D1 ledger for the bus.
 *
 * Every event appends with `hash = SHA-256(prev_hash + canonical payload)`,
 * so the stream is provably ordered and tamper-evident (the same provenance
 * model as the revenue ledger). verifyChain recomputes every hash + linkage.
 */

import type { BusEvent } from '../../src/bus/events';

export interface BusRow {
  id: number;
  event_type: string;
  payload_json: string;
  session_id: string;
  did: string;
  face: string;
  trace_id: string;
  prev_hash: string;
  hash: string;
  created_at: number;
}

export interface Env {
  DB: D1Database;
  AI?: Ai;
  SESSION_ROOM?: DurableObjectNamespace;
  CREDENTIAL_KEY?: string;
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const ZERO_HASH = '0'.repeat(64);

export async function lastHash(env: Env): Promise<string> {
  const row = await env.DB.prepare(
    'SELECT hash FROM bus_events ORDER BY created_at DESC, id DESC LIMIT 1',
  ).first<{ hash: string }>();
  return row?.hash ?? ZERO_HASH;
}

/** RFC 8785-style canonicalization: deterministically ordered keys.
 *  Sorts object keys recursively so identical logical records hash identically
 *  regardless of key insertion order (the IETF AAT draft's canonical form). */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((v) => canonicalJson(v)).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

/** Canonicalize a bus event for hashing (deterministic, ordered keys).
 *  Bus events are flat: { type, sessionId, status, ... } — the envelope
 *  (id/timestamp/did/face) is NOT part of the event shape, so we hash the
 *  type + all non-envelope fields deterministically. */
export function canonical(ev: BusEvent): string {
  const raw = ev as unknown as Record<string, unknown>;
  const { type, sessionId, did, face, timestamp, id, ...rest } = raw;
  return canonicalJson({ type, ...(rest ?? {}) });
}

/** Map a bus event to the IETF AAT audit-record shape (agent_identity,
 *  action_class, outcome, trust_level) for the export surface. */
export function toAatRecord(row: BusRow, meta: { did?: string; face?: string }): Record<string, unknown> {
  const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
  const actionClass = String(payload.agent ?? payload.stage ?? payload.type ?? 'unknown');
  const outcome = row.event_type.includes('error') ? 'error'
    : row.event_type.includes('interrupted') ? 'interrupted'
    : row.event_type === 'run.resumed' ? 'resumed'
    : row.event_type === 'run.finished' ? 'finished'
    : 'in-progress';
  return {
    event_id: row.hash,
    agent_identity: meta.did ?? row.did ?? 'anonymous',
    action_class: actionClass,
    outcome,
    trust_level: 'runtime-observed',
    type: row.event_type,
    payload,
    prev_hash: row.prev_hash,
    hash: row.hash,
    created_at: row.created_at,
  };
}

/** Append an event to the ledger. Returns the stored row. */
export async function append(env: Env, ev: BusEvent, meta: { sessionId?: string; did?: string; face?: string; traceId?: string }): Promise<BusRow> {
  const prev = await lastHash(env);
  const raw = ev as unknown as Record<string, unknown>;
  // Store ONLY the canonical payload (type stripped, envelope excluded) so
  // verifyChain can recompute `{ type, ...payload }` and match the hash.
  const { type, sessionId, did, face, timestamp, id, ...payload } = raw;
  const payloadJson = JSON.stringify(payload);
  const canonicalBody = canonical(ev);
  const hash = await sha256Hex(`${prev}|${canonicalBody}`);
  const now = Date.now();
  const res = await env.DB.prepare(
    `INSERT INTO bus_events (event_type, payload_json, session_id, did, face, trace_id, prev_hash, hash, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  ).bind(
    ev.type,
    payloadJson,
    meta.sessionId ?? '',
    meta.did ?? '',
    meta.face ?? '',
    meta.traceId ?? '',
    prev,
    hash,
    now,
  ).run();
  const idNum = res.meta.last_row_id;
  return { id: idNum, event_type: ev.type, payload_json: payloadJson, session_id: meta.sessionId ?? '', did: meta.did ?? '', face: meta.face ?? '', trace_id: meta.traceId ?? '', prev_hash: prev, hash, created_at: now };
}

/** Recompute + verify the whole chain. */
export async function verifyChain(env: Env): Promise<{ valid: boolean; total_entries: number; last_hash: string }> {
  const rows = await env.DB.prepare('SELECT * FROM bus_events ORDER BY created_at ASC, id ASC').all<BusRow>();
  const entries = rows.results;
  let valid = true;
  let prev = ZERO_HASH;
  for (const e of entries) {
    if (e.prev_hash !== prev) { valid = false; break; }
    const payload = JSON.parse(e.payload_json);
    const canonicalBody = canonicalJson({ type: e.event_type, ...payload });
    const h = await sha256Hex(`${prev}|${canonicalBody}`);
    if (h !== e.hash) { valid = false; break; }
    prev = e.hash;
  }
  const last = entries.length ? entries[entries.length - 1].hash : prev;
  return { valid, total_entries: entries.length, last_hash: last };
}

/** Decode a stored row back to a bus-shaped event.
 *  The ledger row id is stamped onto the event's `id` so clients can key
 *  messages stably (prepend-safe) and resume from a real cursor. The id is not
 *  part of the canonical hash — append() strips it before hashing — so this is
 *  additive and does not change chain verification. */
export function rowToEvent(row: BusRow): BusEvent {
  const payload = JSON.parse(row.payload_json) as Record<string, unknown>;
  return { type: row.event_type, ...payload, id: String(row.id) } as unknown as BusEvent;
}