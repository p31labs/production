/**
 * shell/chat/useThreadListOnScroll.ts — the thread-list load-more hook.
 *
 * A bottom IntersectionObserver loads older conversations as the reader nears
 * the end. Two guards:
 *   - in-flight guard: a load in progress never double-fires.
 *   - ref-guard: the cursor captured at trigger time is compared against the
 *     current query identity at resolve time, so a stale page from a reset is
 *     discarded.
 */
import { useEffect, useRef } from 'react';
import { fetchThreads } from './threadListClient';

export interface ThreadListOnScrollHandlers {
  hasMore: boolean;
  inFlight: boolean;
  cursor: { before: number; session: string } | null;
  onPage: (threads: import('./threadListClient').ThreadSummary[], cursor: { before: number; session: string } | null, hasMore: boolean) => void;
  setInFlight: (v: boolean) => void;
}

export function useThreadListOnScroll({ hasMore, inFlight, cursor, onPage, setInFlight }: ThreadListOnScrollHandlers) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef(cursor);
  cursorRef.current = cursor;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || inFlight || !hasMore) continue;
        const captured = cursorRef.current;
        setInFlight(true);
        void (async () => {
          const page = await fetchThreads(captured, 50);
          if (captured !== cursorRef.current) return; // ref-guard: cursor moved (reset)
          onPage(page.threads, page.nextCursor, page.hasMore);
          setInFlight(false);
        })();
      }
    }, { root: el.parentElement, rootMargin: '600px 0px 600px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, inFlight, onPage, setInFlight]);

  return sentinelRef;
}