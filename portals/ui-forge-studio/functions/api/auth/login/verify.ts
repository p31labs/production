/**
 * api/auth/login/verify.ts — WebAuthn login, step 2 (Wave 3).
 *
 * POST { response } → verifies the assertion, returns the DID bound to the
 * passkey, and sets the `p31_session` cookie ({ did, role: 'viewer' }).
 */
import { verifyLogin, PasskeyError } from '../../../_lib/passkeys';
import { signSession, sessionCookieHeader } from '../../../_lib/session';
import type { AuthenticationResponseJSON } from '@simplewebauthn/server';

interface AuthEnv {
  AUTH_DB?: D1Database;
  SESSION_SECRET?: string;
}

interface LoginVerifyBody {
  response?: AuthenticationResponseJSON;
}

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  if (!env.AUTH_DB) return Response.json({ error: 'AUTH_DB not configured' }, { status: 500 });
  let body: LoginVerifyBody;
  try {
    body = (await request.json()) as LoginVerifyBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!body.response) return Response.json({ error: 'response required' }, { status: 400 });

  try {
    const result = await verifyLogin(env.AUTH_DB, request, { response: body.response });

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