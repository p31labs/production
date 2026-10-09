/**
 * api/auth/login/options.ts — WebAuthn login, step 1 (Wave 3).
 *
 * POST { did? } → PublicKeyCredentialRequestOptionsJSON.
 * The challenge is stored in AUTH_DB; the browser calls
 * navigator.credentials.get() with the returned options.
 */
import { generateLoginOptions, PasskeyError } from '../../../_lib/passkeys';

interface AuthEnv {
  AUTH_DB?: D1Database;
}

interface LoginOptionsBody {
  did?: string;
}

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  if (!env.AUTH_DB) return Response.json({ error: 'AUTH_DB not configured' }, { status: 500 });
  let body: LoginOptionsBody;
  try {
    body = (await request.json()) as LoginOptionsBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  try {
    const options = await generateLoginOptions(env.AUTH_DB, request, { did: body.did?.trim() });
    return Response.json(options);
  } catch (e) {
    const status = e instanceof PasskeyError ? e.status : 400;
    return Response.json({ error: e instanceof Error ? e.message : 'webauthn failure' }, { status });
  }
};