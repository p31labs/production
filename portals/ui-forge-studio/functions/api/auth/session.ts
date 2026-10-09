/**
 * api/auth/session.ts — the current session (Wave 3).
 *
 * GET → { authenticated, did, role }. The middleware has already verified the
 * cookie; this just surfaces it to the client (the tier pill + auth UI).
 */
import type { SessionData } from '../../_middleware';

export const onRequestGet: PagesFunction<object, string, SessionData> = async ({ data }) => {
  const session = data as SessionData;
  return Response.json({
    authenticated: !!session.did,
    did: session.did ?? null,
    role: session.role ?? null,
  });
};