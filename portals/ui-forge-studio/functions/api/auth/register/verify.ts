/**
 * api/auth/register/verify.ts — WebAuthn registration, step 2 (Wave 3).
 *
 * POST { did, response } → verifies the attestation, stores the credential
 * bound to `did` in AUTH_DB, records the DID's default tier (free), and sets
 * the `p31_session` cookie ({ did, role: 'viewer' }).
 */
import { verifyRegister, PasskeyError } from '../../../_lib/passkeys';
import { signSession, sessionCookieHeader } from '../../../_lib/session';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';

interface AuthEnv {
  AUTH_DB?: D1Database;
  SESSION_SECRET?: string;
}

interface RegisterVerifyBody {
  did?: string;
  response?: RegistrationResponseJSON;
}

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  if (!env.AUTH_DB) return Response.json({ error: 'AUTH_DB not configured' }, { status: 500 });
  let body: RegisterVerifyBody;
  try {
    body = (await request.json()) as RegisterVerifyBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.response) return Response.json({ error: 'response required' }, { status: 400 });

  try {
    const result = await verifyRegister(env.AUTH_DB, request, {
      did: body.did?.trim(),
      response: body.response,
    });

    // Record the DID's first sight (default Free tier — the entitlement
    // worker is the source of truth for quota; tier-set syncs happen there).
    // `forge_users` (not `users`, which apps/auth owns on this shared D1).
    await env.AUTH_DB
      .prepare('INSERT OR IGNORE INTO forge_users (did, tier, created_at) VALUES (?, ?, ?)')
      .bind(result.did, 'free', Date.now())
      .run()
      .catch(() => {
        // table missing — best-effort
      });

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (env.SESSION_SECRET) {
      const token = await signSession(env.SESSION_SECRET, result.did, 'viewer');
      headers['Set-Cookie'] = sessionCookieHeader(token);
    }
    return new Response(JSON.stringify({ verified: true, did: result.did, credentialID: result.credentialID, role: 'viewer' }), { status: 200, headers });
  } catch (e) {
    const status = e instanceof PasskeyError ? e.status : 400;
    return Response.json({ error: e instanceof Error ? e.message : 'webauthn failure' }, { status });
  }
};