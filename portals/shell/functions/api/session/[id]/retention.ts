/**
 * api/session/[id]/retention — read/set a session retention policy.
 *
 * The 180-day floor: a requested retentionDays below 180 is rejected (400).
 * The change itself is audited as a `session.retention.changed` ledger event.
 */
import { append, type Env } from '../../../_lib/ledger';
import type { BusEvent } from '../../../../src/bus/events';

const RETENTION_FLOOR_DAYS = 180;

export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const sessionId = String(params.id);
  const row = await env.DB.prepare(
    `SELECT payload_json FROM bus_events
     WHERE session_id = ?1 AND event_type = 'session.retention.changed'
     ORDER BY created_at DESC, id DESC LIMIT 1`,
  ).bind(sessionId).first<{ payload_json: string }>();

  let retentionDays = RETENTION_FLOOR_DAYS;
  if (row) {
    const payload = JSON.parse(row.payload_json) as { retentionDays?: number };
    retentionDays = Math.max(180, payload.retentionDays ?? RETENTION_FLOOR_DAYS);
  }

  return Response.json({ sessionId, retentionDays });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const sessionId = String(params.id);
  let body: { retentionDays?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const requested = Number(body.retentionDays);
  if (!Number.isFinite(requested) || requested < 180) {
    return Response.json(
      { error: 'retentionDays must be at least 180 (180-day floor)' },
      { status: 400 },
    );
  }

  const retentionDays = Math.max(180, requested);
  await append(env, {
    type: 'session.retention.changed',
    sessionId,
    retentionDays,
  } as BusEvent, { sessionId, face: 'compliance' });

  return Response.json({ ok: true, sessionId, retentionDays });
};