/**
 * api/artifacts/revoke — end a single share ahead of its window.
 *
 * Same audit contract as the sweep: artifact.share.expired is appended before
 * the row is removed, so a revoked link and an expired link are indistinguishable
 * in the ledger (which is the point — both mean the copy is gone).
 */
import { append, type Env } from '../../_lib/ledger';
import type { BusEvent } from '../../../src/bus/events';
import { ensureSharedArtifacts } from './schema';

interface RevokeBody {
  shareId?: string;
  sessionId?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: RevokeBody;
  try {
    body = (await request.json()) as RevokeBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const shareId = typeof body.shareId === 'string' ? body.shareId : '';
  if (!shareId) return Response.json({ error: 'shareId is required' }, { status: 400 });

  await ensureSharedArtifacts(env);
  const row = await env.DB.prepare(
    'SELECT share_id, session_id, artifact_key FROM shared_artifacts WHERE share_id = ?1',
  ).bind(shareId).first<{ share_id: string; session_id: string; artifact_key: string }>();
  if (!row) return Response.json({ error: 'no such share' }, { status: 404 });

  const sessionId = typeof body.sessionId === 'string' && body.sessionId ? body.sessionId : row.session_id;
  await append(env, {
    type: 'artifact.share.expired',
    sessionId,
    artifactKey: row.artifact_key,
    shareId: row.share_id,
  } as BusEvent, { sessionId, face: 'chat' });
  await env.DB.prepare('DELETE FROM shared_artifacts WHERE share_id = ?1').bind(shareId).run();

  return Response.json({ revoked: shareId });
};
