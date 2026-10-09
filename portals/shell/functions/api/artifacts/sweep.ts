/**
 * api/artifacts/sweep — the retention sweep.
 *
 * Rule 3 of the feature: the copy's life is bounded, and the bound is audited.
 * The sweep appends artifact.share.expired for every row it reaps, THEN deletes
 * the row — the ledger records the death, the table records the life.
 *
 * Run it on a schedule (Pages cron / manual POST) or on demand; it is
 * idempotent — a second run over an empty window appends nothing.
 */
import { append, type Env } from '../../_lib/ledger';
import type { BusEvent } from '../../../src/bus/events';
import { ensureSharedArtifacts } from './schema';

interface ExpiredRow {
  share_id: string;
  session_id: string;
  artifact_key: string;
}

async function runSweep(env: Env): Promise<{ expired: number }> {
  await ensureSharedArtifacts(env);
  const now = Date.now();
  const expired = await env.DB.prepare(
    'SELECT share_id, session_id, artifact_key FROM shared_artifacts WHERE expires_at <= ?1',
  ).bind(now).all<ExpiredRow>();

  let count = 0;
  for (const row of expired.results ?? []) {
    await append(env, {
      type: 'artifact.share.expired',
      sessionId: row.session_id,
      artifactKey: row.artifact_key,
      shareId: row.share_id,
    } as BusEvent, { sessionId: row.session_id, face: 'chat' });
    await env.DB.prepare('DELETE FROM shared_artifacts WHERE share_id = ?1').bind(row.share_id).run();
    count += 1;
  }
  return { expired: count };
}

async function sweepHandler(env: Env): Promise<Response> {
  const result = await runSweep(env);
  return Response.json(result);
}

export const onRequestPost: PagesFunction<Env> = async ({ env }) => sweepHandler(env);
export const onRequestGet: PagesFunction<Env> = async ({ env }) => sweepHandler(env);
