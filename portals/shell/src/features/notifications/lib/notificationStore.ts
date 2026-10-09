/**
 * @file notificationStore.ts — zustand store for the notifications inbox.
 *
 * Two-tier model: `active` holds live, unread notifications; `history` holds
 * everything that has been marked read. Incoming notifications are buffered in
 * a small pending array and flushed once per animation frame (the same rAF
 * discipline as threadStore) so a burst of mentions lands as one state update.
 */

import { create } from 'zustand';

export interface Notification {
  id: string;
  objectType: 'page' | 'comment';
  objectId: string;
  reason: 'mention' | 'reply' | 'resolved';
  count: number;
  actorDid: string;
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  active: Notification[];
  history: Notification[];
  markRead: (id: string) => void;
  add: (n: Notification) => void;
}

/**
 * The dedup identity of a notification: notifications for the same target and
 * reason collapse into a single entry whose `count` increments. A bare id is
 * never reused because the same target can legitimately re-notify.
 */
export function dedupKey(n: Pick<Notification, 'objectType' | 'objectId' | 'reason'>): string {
  return `${n.objectType}:${n.objectId}:${n.reason}`;
}

// ── requestAnimationFrame batching ─────────────────────────────────────────
let pending: Notification[] = [];
let rafHandle: number | null = null;

function flushPending() {
  rafHandle = null;
  const batch = pending;
  pending = [];
  if (batch.length === 0) return;

  const state = useNotificationStore.getState();
  let next = state.active;
  for (const n of batch) {
    const key = dedupKey(n);
    const idx = next.findIndex((x) => dedupKey(x) === key);
    if (idx >= 0) {
      next = [...next];
      next[idx] = { ...next[idx]!, count: next[idx]!.count + n.count };
    } else {
      next = [...next, n];
    }
  }
  useNotificationStore.setState({ active: next });
}

function scheduleFlush() {
  if (rafHandle != null) return;
  const hasRaf = typeof requestAnimationFrame === 'function';
  const raf = hasRaf
    ? requestAnimationFrame
    : ((cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number);
  rafHandle = raf(() => flushPending());
}

export const useNotificationStore = create<NotificationState>((set) => ({
  active: [],
  history: [],

  markRead(id) {
    set((state) => {
      const target = state.active.find((n) => n.id === id);
      if (!target) return state;
      return {
        active: state.active.filter((n) => n.id !== id),
        history: [{ ...target, read: true }, ...state.history],
      };
    });
  },

  add(n) {
    pending.push(n);
    scheduleFlush();
  },
}));