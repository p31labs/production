/**
 * store/useNotifStore.ts — the shell's notification store.
 *
 * Canon-shaped: NotificationKind = info | success | milestone | error.
 * Each notification optionally carries `burst` — when set, the starfield
 * flares (the ambient layer listens). Auto-dismiss timers are owned here
 * (NOTIFICATION_DURATION from the canon), so surfaces just call notify().
 */
import { create } from 'zustand';
import type { NotificationKind } from '@p31ca/design-core/compositions';

export interface ShellNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  sentAt: number;
  /** When set, the starfield flares a few stars (the ambient echo). */
  burst?: boolean;
}

export interface NotifState {
  items: ShellNotification[];
  seq: number;
  notify: (n: { kind: NotificationKind; title: string; body?: string; burst?: boolean }) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const MAX_KEPT = 8;

/** Per-kind auto-dismiss (ms) — mirrors the canon timing. */
const AUTO_DISMISS_MS: Record<NotificationKind, number> = {
  info: 4500,
  success: 4000,
  milestone: 5000,
  error: 8000,
};

export const useNotifStore = create<NotifState>((set, get) => ({
  items: [],
  seq: 0,
  notify: (n) => {
    const seq = get().seq + 1;
    const notif: ShellNotification = {
      id: `n${seq}-${Date.now()}`,
      kind: n.kind,
      title: n.title,
      body: n.body,
      sentAt: Date.now(),
      burst: n.burst,
    };
    set({ seq, items: [...get().items.slice(-(MAX_KEPT - 1)), notif] });
    // Auto-dismiss after the canon per-kind duration.
    const ms = AUTO_DISMISS_MS[n.kind] ?? 4500;
    setTimeout(() => {
      get().dismiss(notif.id);
    }, ms);
  },
  dismiss: (id) => set({ items: get().items.filter((n) => n.id !== id) }),
  clearAll: () => set({ items: [] }),
}));