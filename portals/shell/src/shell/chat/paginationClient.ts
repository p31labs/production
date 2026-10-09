/**
 * shell/chat/paginationClient.ts — the load-older cursor walk.
 *
 * Fetches a page of messages strictly older than `before` (the ledger id of the
 * oldest retained message), scoped to the session. A bounded in-invocation hop
 * advances the cursor past pages that yield nothing renderable, so a
 * fully-filtered page cannot stall the walk on the same cursor forever.
 */
import { fetchEvents } from '../../bus/client';

/** When a page yields nothing, hop the cursor this many times before giving up. */
export const MAX_FILTERED_PAGE_HOPS = 5;

export interface OlderPage {
  events: Array<{ id: string; type: string }>;
  hasMore: boolean;
}

/** Fetch one page of older messages. Returns the raw response so the caller can
 *  filter by type; the bounded hop is the caller's loop guard. */
export async function fetchOlder(sessionId: string, before: string | null, limit = 50): Promise<{ events: unknown[]; hasMore: boolean }> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  params.set('session', sessionId);
  const res = await fetch(`/api/bus/events?${params.toString()}`);
  if (!res.ok) return { events: [], hasMore: false };
  const data = (await res.json()) as { events?: unknown[]; hasMore?: boolean };
  return { events: data.events ?? [], hasMore: data.hasMore ?? false };
}

/** Re-export the raw bus fetch for the hydrate path (kept distinct from the
 *  paginated walk so the two do not drift). */
export { fetchEvents };