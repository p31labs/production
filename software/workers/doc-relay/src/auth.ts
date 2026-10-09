/**
 * @file auth.ts — PQC capability-token authorization for the doc relay.
 *
 * Pure (no DO state), so it is unit-testable. The token may arrive via the
 * `token` query param (primary; y-websocket `params`) or via a
 * `sec-websocket-protocol` subprotocol (Cloudflare AI Gateway pattern — for
 * clients that cannot set custom headers). The room comes from the URL path.
 */

import { verifySelfContainedCapabilityToken } from '@p31ca/sovereign-primitives';
import { RELAY_AUDIENCE, RELAY_CAPS } from './doc-relay';

/** Subprotocol prefix carrying the capability token: `p31-cap-<token>`. */
export const TOKEN_SUBPROTOCOL_PREFIX = 'p31-cap-';

/** The subprotocol the y-websocket client requests. */
export const YJS_SUBPROTOCOL = 'yjs';

/** Pulls the capability token from the query param or the subprotocol header. */
export function extractTokenFromRequest(request: {
  url: string;
  headers?: { get(name: string): string | null };
}): string | null {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get('token');
  if (queryToken) return queryToken;
  const subprotocol = request.headers?.get('sec-websocket-protocol');
  if (subprotocol) {
    for (const part of subprotocol.split(',')) {
      const s = part.trim();
      if (s.startsWith(TOKEN_SUBPROTOCOL_PREFIX)) {
        return s.slice(TOKEN_SUBPROTOCOL_PREFIX.length);
      }
    }
  }
  return null;
}

/**
 * Selects the subprotocol to echo in the 101 response: prefer the token
 * subprotocol (proves the client presented it), else the client's first
 * requested protocol (e.g. `yjs`) so the browser completes the handshake.
 */
export function negotiateWebSocketProtocol(request: {
  url: string;
  headers?: { get(name: string): string | null };
}): string | undefined {
  const subprotocol = request.headers?.get('sec-websocket-protocol');
  if (!subprotocol) return undefined;
  const list = subprotocol.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return undefined;
  return list.find((s) => s.startsWith(TOKEN_SUBPROTOCOL_PREFIX)) ?? list[0];
}

/** Returns the authorized room name, or null if the token is invalid. */
export async function authorizeRequest(request: {
  url: string;
  headers?: { get(name: string): string | null };
}): Promise<string | null> {
  const url = new URL(request.url);
  const room = url.pathname.replace(/^\/+/, '') || 'default';
  const token = extractTokenFromRequest(request);
  if (!token) return null;
  const claims = await verifySelfContainedCapabilityToken(token, {
    expectAud: RELAY_AUDIENCE,
    expectRoom: room,
    requireCaps: RELAY_CAPS,
  });
  return claims ? room : null;
}