/**
 * shell/chat/streamClient.ts — the chat surface's bus transport, session-scoped.
 *
 * Hydrates recent events from the ledger, then streams live over SSE. Every
 * event — replayed or live — is filtered by sessionId so a message from another
 * conversation never leaks into this thread (the cross-session bleed fix).
 *
 * Two ordering/streaming invariants live here:
 *
 *   1. Chronological replay. The ledger returns the window newest-first; it is
 *      reversed before delivery so messages mount oldest-first — which is what
 *      the load-older cursor (messages[0] = oldest) and the transcript order
 *      both assume.
 *   2. No hydrate→connect gap. The last row id the hydrate saw is passed as
 *      `?since=` to the SSE endpoint, whose first poll replays `id > since`.
 *      One ordered, id-ascending stream: nothing missed, nothing doubled.
 *
 * `abort()` is real: it aborts the in-flight hydrate fetch and closes the
 * EventSource, not just a local flag.
 */
import { fetchEvents } from '../../bus/client';
import type { BusEvent } from '../../bus/events';

export interface ChatStream {
  /** Hydrate from the ledger, then stream live — filtered to `sessionId`. */
  start(onEvent: (ev: BusEvent) => void, onHydrated?: (info: { windowSize: number }) => void): Promise<void>;
  /** Abort the hydrate fetch + close the live stream. */
  abort(): void;
}

const BASE = import.meta.env.VITE_BUS_URL ?? '';
const sessionOf = (ev: BusEvent): string | undefined => (ev as unknown as { sessionId?: string }).sessionId;
const numericId = (id: unknown): number => Number(id) || 0;

export function createChatStream(sessionId: string): ChatStream {
  let es: EventSource | null = null;
  let controller: AbortController | null = null;
  let aborted = false;

  return {
    async start(onEvent, onHydrated) {
      aborted = false;
      controller = new AbortController();

      // Hydrate: the newest window of ledger rows, filtered to this session.
      // The raw window size (pre-filter) is the "there may be older history"
      // latch for load-older: a full window means the tail was cut off.
      const recent = await fetchEvents(500);
      if (aborted) return;
      const windowSize = recent.length;

      // Cursor BEFORE replay: the SSE connection resumes strictly after it.
      const maxId = recent.reduce((m, ev) => Math.max(m, numericId((ev as unknown as { id?: string }).id)), 0);

      // Ledger rows arrive newest-first; replay oldest-first so the thread
      // mounts chronologically (oldest message at index 0, where the
      // load-older cursor reads it).
      const ordered = [...recent].reverse();
      for (const ev of ordered) {
        if (aborted) return;
        if (sessionOf(ev) === sessionId) onEvent(ev);
      }
      onHydrated?.({ windowSize });

      // Live stream, session-filtered. `since` makes the connection itself
      // gap-free: its first poll replays every row after the hydrate cursor.
      if (aborted) return;
      es = new EventSource(`${BASE}/api/bus/stream${maxId > 0 ? `?since=${maxId}` : ''}`);
      es.onmessage = (msg) => {
        if (aborted) return;
        try {
          const ev = JSON.parse(msg.data) as BusEvent;
          if (sessionOf(ev) === sessionId) onEvent(ev);
        } catch { /* skip malformed */ }
      };
      es.onerror = () => { /* EventSource auto-reconnects (Last-Event-ID) */ };
    },

    abort() {
      aborted = true;
      controller?.abort();
      es?.close();
      es = null;
      controller = null;
    },
  };
}
