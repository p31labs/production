/**
 * api/auth/register/options.ts — WebAuthn registration, step 1 (Wave 3).
 *
 * POST { did, username? } → PublicKeyCredentialCreationOptionsJSON.
 * The challenge is stored in AUTH_DB; the browser calls
 * navigator.credentials.create() with the returned options.
 */
import { generateRegisterOptions, PasskeyError } from '../../../_lib/passkeys';

interface AuthEnv {
  AUTH_DB?: D1Database;
}

interface RegisterOptionsBody {
  did?: string;
  username?: string;
}

export const onRequestPost: PagesFunction<AuthEnv> = async ({ request, env }) => {
  if (!env.AUTH_DB) return Response.json({ error: 'AUTH_DB not configured' }, { status: 500 });
  let body: RegisterOptionsBody;
  try {
    body = (await request.json()) as RegisterOptionsBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const did = body.did?.trim();
  if (!did) return Response.json({ error: 'did required' }, { status: 400 });
  if (!did.startsWith('did:key:')) return Response.json({ error: 'did must be a did:key identifier' }, { status: 400 });
  try {
    const options = await generateRegisterOptions(env.AUTH_DB, request, { did, username: body.username });
    return Response.json(options);
  } catch (e) {
    const status = e instanceof PasskeyError ? e.status : 400;
    return Response.json({ error: e instanceof Error ? e.message : 'webauthn failure' }, { status });
  }
};