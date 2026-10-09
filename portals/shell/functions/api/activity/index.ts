/**
 * api/activity — read-only activity feed over the bus_events ledger.
 *
 * Supports:
 *   ?limit=    (default 100, max 500)
 *   ?before=   (ledger id cursor — events strictly older, newest-first)
 *   ?actor=    (filter to a single actor DID)
 *   ?type=     (filter to one allowlisted event type)
 *   ?scope=    (type-namespace prefix, e.g. "page", "comment")
 *
 * Only allowlisted event types are ever read; no table is created and no
 * join is performed. Returns { events, hasMore } where hasMore comes from a
 * limit + 1 probe.
 */

import { ACTIVITY_ALLOWLIST } from '../../../src/features/activity/lib/activityLabels';
import { type BusRow, type Env } from '../../_lib/ledger';

export interface ActivityEvent {
  id: string;
  type: string;
  actor: string;
  face: string;
  sessionId: string;
  createdAt: number;
  payload: Record<string, unknown>;
}

function safeParse(json: string): Record<string, unknown> {
  try {
    const value = JSON.parse(json);
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function rowToActivity(row: BusRow): ActivityEvent {
  return {
    id: String(row.id),
    type: row.event_type,
    actor: row.did,
    face: row.face,
    sessionId: row.session_id,
    createdAt: row.created_at,
    payload: safeParse(row.payload_json),
  };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const limit = Math.min(500, Number(url.searchParams.get('limit') ?? 100) || 100);
  const before = url.searchParams.get('before');
  const actor = url.searchParams.get('actor');
  const type = url.searchParams.get('type');
  const scope = url.searchParams.get('scope');

  const conds: string[] = [];
  const params: unknown[] = [];

  conds.push(`event_type IN (${ACTIVITY_ALLOWLIST.map(() => '?').join(',')})`);
  params.push(...ACTIVITY_ALLOWLIST);

  if (before) {
    conds.push('id < ?');
    params.push(Number(before) || 0);
  }
  if (actor) {
    conds.push('did = ?');
    params.push(actor);
  }
  if (type) {
    conds.push('event_type = ?');
    params.push(type);
  }
  if (scope) {
    conds.push('event_type LIKE ?');
    params.push(`${scope}.%`);
  }

  const probe = limit + 1;
  const stmt = env.DB.prepare(
    `SELECT * FROM bus_events WHERE ${conds.join(' AND ')} ORDER BY id DESC LIMIT ?`,
  ).bind(...params, probe);

  const rows = await stmt.all<BusRow>();
  const results = rows.results.slice(0, limit);
  const events = results.map(rowToActivity);

  return Response.json({ events, hasMore: rows.results.length > limit });
};