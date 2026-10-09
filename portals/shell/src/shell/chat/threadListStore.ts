/**
 * shell/chat/threadListStore.ts — the thread list state.
 *
 * Holds the conversation list, the tuple cursor, the hasMore latch, and the
 * date buckets. Buckets are COMPUTED from lastMessageAt against the user's
 * local midnight — never stored — so a row whose bucket is Today never renders
 * under a Yesterday header.
 */
import { create } from 'zustand';
import type { ThreadSummary, ThreadCursor } from './threadListClient';

export type DateBucket = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Older';

export interface BucketedThread {
  thread: ThreadSummary;
  bucket: DateBucket;
}

export interface ThreadListState {
  threads: ThreadSummary[];
  buckets: BucketedThread[];
  cursor: ThreadCursor | null;
  hasMore: boolean;
  inFlight: boolean;
  activeId: string | null;

  appendPage(threads: ThreadSummary[], cursor: ThreadCursor | null, hasMore: boolean): void;
  setActive(id: string): void;
  setInFlight(v: boolean): void;
  reset(): void;
}

/** Local midnight of a timestamp. */
function localMidnight(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Bucket a thread by its lastMessageAt against local time. */
export function bucketOf(lastMessageAt: number, now = Date.now()): DateBucket {
  const t = localMidnight(lastMessageAt);
  const today = localMidnight(now);
  const day = 24 * 60 * 60 * 1000;
  if (t >= today) return 'Today';
  if (t >= today - day) return 'Yesterday';
  if (t >= today - 7 * day) return 'This Week';
  if (t >= today - 30 * day) return 'This Month';
  return 'Older';
}

export const useThreadListStore = create<ThreadListState>((set, get) => ({
  threads: [],
  buckets: [],
  cursor: null,
  hasMore: false,
  inFlight: false,
  activeId: null,

  appendPage(threads, cursor, hasMore) {
    const seen = new Set(get().threads.map((t) => t.id));
    const fresh = threads.filter((t) => !seen.has(t.id));
    const next = [...get().threads, ...fresh];
    set({
      threads: next,
      buckets: next.map((t) => ({ thread: t, bucket: bucketOf(t.lastMessageAt) })),
      cursor,
      hasMore,
    });
  },

  setActive(id) {
    set({ activeId: id });
  },

  setInFlight(v) {
    set({ inFlight: v });
  },

  reset() {
    set({ threads: [], buckets: [], cursor: null, hasMore: false, inFlight: false, activeId: null });
  },
}));