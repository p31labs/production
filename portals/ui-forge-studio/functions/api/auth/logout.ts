/**
 * api/auth/logout.ts — clear the session (Wave 3).
 *
 * POST → clears the `p31_session` cookie.
 */
import { clearSessionCookieHeader } from '../../_lib/session';

export const onRequestPost: PagesFunction = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearSessionCookieHeader() },
  });
};