/**
 * _middleware.ts — session-cookie auth for every Pages Function (Wave 3).
 *
 * Reads the `p31_session` cookie (HMAC-signed with `SESSION_SECRET`), verifies
 * it, and attaches `did` + `role` to `context.data`. Downstream handlers read
 * `(context.data as SessionData).did`. When the cookie is absent or invalid,
 * `did` stays undefined — the handler decides whether that is acceptable.
 */
import { verifySession, readSessionCookie } from './_lib/session';
import type { Role } from './_lib/roles';

export interface SessionData {
  did?: string;
  role?: Role;
  [key: string]: unknown;
}

interface MiddlewareEnv {
  SESSION_SECRET?: string;
}

export const onRequest: PagesFunction<MiddlewareEnv> = async (context) => {
  const { request, env, next } = context;
  if (env.SESSION_SECRET) {
    const token = readSessionCookie(request);
    if (token) {
      const session = await verifySession(env.SESSION_SECRET, token);
      if (session) {
        (context.data as SessionData).did = session.did;
        (context.data as SessionData).role = session.role;
      }
    }
  }
  return next();
};