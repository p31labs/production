/**
 * api/credentials — BYOK provider credential lifecycle.
 *
 * Connect (POST) encrypts the provider key under the master key and stores
 * only ciphertext + iv + fingerprint. List (GET) returns metadata only — never
 * the key material. Disconnect (DELETE) revokes (sets revoked_at) and emits
 * credential.disconnected. Both lifecycle events carry the fingerprint, never
 * the key.
 */
import { append, type Env } from '../../_lib/ledger';
import { encryptKey, sha256Fingerprint } from '../../_lib/credentials';
import type { BusEvent } from '../../../src/bus/events';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const did = url.searchParams.get('did');
  let where = '';
  const binds: unknown[] = [];
  if (did) {
    where = ' WHERE did = ?';
    binds.push(did);
  }

  try {
    const rows = await env.DB.prepare(
      `SELECT did, provider, fingerprint, created_at, revoked_at FROM credentials${where}
       ORDER BY created_at DESC`,
    ).bind(...binds).all();
    return Response.json({ credentials: rows.results });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'list failed' }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { did?: string; provider?: string; key?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const did = body.did ?? '';
  const provider = body.provider ?? '';
  const key = body.key ?? '';
  if (!did || !provider || !key) {
    return Response.json({ error: 'did, provider, and key are required' }, { status: 400 });
  }

  try {
    const { ciphertext, iv } = await encryptKey(env, key);
    const fingerprint = await sha256Fingerprint(key);
    const id = crypto.randomUUID();
    const createdAt = Date.now();

    await env.DB.prepare(
      `INSERT INTO credentials (id, did, provider, ciphertext, iv, fingerprint, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    ).bind(id, did, provider, ciphertext, iv, fingerprint, createdAt).run();

    await append(env, {
      type: 'credential.connected',
      sessionId: '',
      did,
      provider,
      fingerprint,
    } as BusEvent, { sessionId: '', did, face: 'chat' });

    return Response.json({ ok: true, id, fingerprint });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'connect failed' }, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  let body: { did?: string; provider?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const did = body.did ?? '';
  const provider = body.provider ?? '';
  if (!did || !provider) {
    return Response.json({ error: 'did and provider are required' }, { status: 400 });
  }

  try {
    const row = await env.DB.prepare(
      `SELECT fingerprint FROM credentials
       WHERE did = ? AND provider = ? AND revoked_at IS NULL
       ORDER BY created_at DESC LIMIT 1`,
    ).bind(did, provider).first<{ fingerprint: string }>();

    await env.DB.prepare(
      `UPDATE credentials SET revoked_at = ?
       WHERE did = ? AND provider = ? AND revoked_at IS NULL`,
    ).bind(Date.now(), did, provider).run();

    if (row?.fingerprint) {
      await append(env, {
        type: 'credential.disconnected',
        sessionId: '',
        did,
        provider,
        fingerprint: row.fingerprint,
      } as BusEvent, { sessionId: '', did, face: 'chat' });
    }

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'disconnect failed' }, { status: 500 });
  }
};