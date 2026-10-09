/**
 * shell/chat/threadListClient.ts — the thread-list cursor walk.
 *
 * The cursor is the tuple (lastMessageAt, sessionId); two threads modified in
 * the same millisecond never collide. The walk is exclusive and returns the
 * next cursor for the following page.
 */
export interface ThreadSummary {
  id: string;
  lastMessageAt: number;
  messageCount: number;
}

export interface ThreadCursor {
  before: number;
  session: string;
}

export interface ThreadPage {
  threads: ThreadSummary[];
  hasMore: boolean;
  nextCursor: ThreadCursor | null;
}

export async function fetchThreads(cursor: ThreadCursor | null, limit = 50): Promise<ThreadPage> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) {
    params.set('before', String(cursor.before));
    params.set('session', cursor.session);
  }
  const res = await fetch(`/api/conversations?${params.toString()}`);
  if (!res.ok) return { threads: [], hasMore: false, nextCursor: null };
  const data = (await res.json()) as { conversations?: ThreadSummary[]; hasMore?: boolean; nextCursor?: ThreadCursor | null };
  return {
    threads: data.conversations ?? [],
    hasMore: data.hasMore ?? false,
    nextCursor: data.nextCursor ?? null,
  };
}