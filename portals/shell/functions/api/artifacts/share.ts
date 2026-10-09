/**
 * api/artifacts/share — the explicit share and the read-only copy.
 *
 * Rule 1 of the feature: nothing is persisted unless the author shares it. The
 * POST only stores a copy behind an explicit confirmation flag; without it the
 * request is refused with 400. A stored copy is bounded by a retention window
 * (retention_secs) and is served read-only — the viewer renders it, nobody
 * edits it.
 *
 * The share is audited: artifact.shared (key, share id, author did, window) and
 * artifact.persisted (the durable tier — the content hash, not the bytes) are
 * appended to the hash-chained ledger.
 *
 * GET resolves a copy two ways: ?shareId=<id> (the link) or ?session=&key=
 * (the durable tier rehydrating its own artifact after the session ended).
 */
import { append, sha256Hex, type Env } from '../../_lib/ledger';
import type { BusEvent } from '../../../src/bus/events';
import { clampRetention, ensureSharedArtifacts, type SharedArtifactRow } from './schema';

interface ShareBody {
  sessionId?: string;
  artifactKey?: string;
  kind?: string;
  title?: string;
  content?: string;
  authorDid?: string;
  retentionSecs?: number;
  /** The author's deliberate act. Absent/false → nothing is stored. */
  explicitShare?: boolean;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: ShareBody;
  try {
    body = (await request.json()) as ShareBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
  const artifactKey = typeof body.artifactKey === 'string' ? body.artifactKey : '';
  const content = typeof body.content === 'string' ? body.content : '';
  if (!sessionId || !artifactKey || !content) {
    return Response.json({ error: 'sessionId, artifactKey and content are required' }, { status: 400 });
  }

  await ensureSharedArtifacts(env);

  const explicitShare = body.explicitShare === true;
  if (explicitShare) {
    const shareId = crypto.randomUUID();
    const retentionSecs = clampRetention(body.retentionSecs);
    const createdAt = Date.now();
    const expiresAt = createdAt + retentionSecs * 1000;
    const contentHash = await sha256Hex(content);
    const kind = typeof body.kind === 'string' && body.kind ? body.kind : 'code';
    const title = typeof body.title === 'string' && body.title ? body.title : artifactKey;
    const authorDid = typeof body.authorDid === 'string' ? body.authorDid : '';

    await env.DB.prepare(
      `INSERT INTO shared_artifacts (share_id, session_id, artifact_key, kind, title, content, content_hash, author_did, retention_secs, created_at, expires_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`,
    ).bind(shareId, sessionId, artifactKey, kind, title, content, contentHash, authorDid, retentionSecs, createdAt, expiresAt).run();

    await append(env, {
      type: 'artifact.shared',
      sessionId,
      artifactKey,
      shareId,
      retentionSecs,
      authorDid,
    } as BusEvent, { sessionId, did: authorDid, face: 'chat' });
    await append(env, {
      type: 'artifact.persisted',
      sessionId,
      artifactKey,
      kind,
      title,
      contentHash,
      authorDid,
      createdAt: new Date(createdAt).toISOString(),
    } as BusEvent, { sessionId, did: authorDid, face: 'chat' });

    return Response.json({ shareId, expiresAt, contentHash, readOnly: true });
  }

  return Response.json(
    { error: 'a share must be explicit — nothing is persisted otherwise' },
    { status: 400 },
  );
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const shareId = url.searchParams.get('shareId');
  const session = url.searchParams.get('session');
  const key = url.searchParams.get('key');
  await ensureSharedArtifacts(env);
  const now = Date.now();

  let row: SharedArtifactRow | null = null;
  if (shareId) {
    row = await env.DB.prepare(
      'SELECT * FROM shared_artifacts WHERE share_id = ?1 AND expires_at > ?2',
    ).bind(shareId, now).first<SharedArtifactRow>();
  } else if (session && key) {
    row = await env.DB.prepare(
      'SELECT * FROM shared_artifacts WHERE session_id = ?1 AND artifact_key = ?2 AND expires_at > ?3 ORDER BY created_at DESC',
    ).bind(session, key, now).first<SharedArtifactRow>();
  }

  if (!row) {
    return Response.json({ error: 'no such share' }, { status: 404 });
  }

  // The copy is served read-only: content in, content out, no mutation route.
  return Response.json({
    shareId: row.share_id,
    artifactKey: row.artifact_key,
    kind: row.kind,
    title: row.title,
    content: row.content,
    contentHash: row.content_hash,
    expiresAt: row.expires_at,
    readOnly: true,
  });
};
