/**
 * shell/chat/useLoadOlderOnScroll.ts — the load-older sentinel hook.
 *
 * A top IntersectionObserver with a one-viewport rootMargin prefetches older
 * messages as the reader nears the top. Two guards, each a known bug:
 *
 *   1. in-flight guard — a load in progress never double-fires.
 *   2. ref-guard on the conversation id captured at trigger time — a load that
 *      resolves after a switch to another conversation is discarded (id-dedupe
 *      cannot catch it; different conversations have different ids).
 *
 * The prepend-vs-append distinction (whether to pull to the bottom) is the
 * COMPONENT's decision, not this hook's — the virtualizer's followOnAppend
 * already pins only on appends, so history backfill never pulls.
 */
import { useEffect, useRef } from 'react';
import { fetchOlder, MAX_FILTERED_PAGE_HOPS } from './paginationClient';
import type { ChatMessage } from './threadStore';

export interface LoadOlderHandlers {
  sessionId: string;
  hasMore: boolean;
  inFlight: boolean;
  oldestId: string | null;
  /** Called with the older page (already mapped to messages) and the hasMore flag. */
  onPage: (older: ChatMessage[], hasMore: boolean) => void;
  setInFlight: (v: boolean) => void;
}

export function useLoadOlderOnScroll({ sessionId, hasMore, inFlight, oldestId, onPage, setInFlight }: LoadOlderHandlers) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const currentSessionRef = useRef(sessionId);
  currentSessionRef.current = sessionId;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || inFlight || !hasMore) continue;
        const capturedId = sessionId; // ref-guard: capture at trigger time
        setInFlight(true);
        void (async () => {
          let cursor = oldestId;
          for (let hop = 0; hop < MAX_FILTERED_PAGE_HOPS; hop++) {
            const page = await fetchOlder(capturedId, cursor, 50);
            if (capturedId !== currentSessionRef.current) return; // cross-conversation bleed guard
            // The ledger page is newest-first. History must arrive oldest-first,
            // or the prepend lands ahead of messages[0] out of order. The cursor
            // hop stays on the DESC page — its last row is the page's oldest.
            const desc = page.events;
            const cursorNext = (desc[desc.length - 1] as { id?: string } | undefined)?.id ?? cursor;
            const older = [...desc]
              .reverse()
              .filter((e) => (e as { type?: string }).type === 'message.content')
              .map((e) => {
                const ev = e as { id: string; role?: 'user' | 'assistant'; text?: string; sessionId?: string };
                return { id: ev.id, role: ev.role ?? 'assistant', text: typeof ev.text === 'string' ? ev.text : '', sessionId: ev.sessionId ?? capturedId } as ChatMessage;
              });
            if (older.length > 0) { onPage(older, page.hasMore); break; }
            if (!page.hasMore) { onPage([], false); break; }
            cursor = cursorNext; // filtered page → advance the cursor (bounded hop)
          }
          setInFlight(false);
        })();
      }
    }, { root: el.parentElement, rootMargin: '600px 0px 600px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [sessionId, hasMore, inFlight, oldestId, onPage, setInFlight]);

  return { sentinelRef };
}