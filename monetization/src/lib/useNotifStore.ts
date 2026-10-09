import { create } from 'zustand';

export type NotifKind = 'info' | 'success' | 'milestone' | 'error';

export interface Notification {
  id: string;
  kind: NotifKind;
  title: string;
  body?: string;
  sentAt: number;
  burst?: boolean;
}

interface NotifState {
  items: Notification[];
  seq: number;
  notify: (n: { kind: NotifKind; title: string; body?: string; burst?: boolean }) => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const MAX_KEPT = 8;

export const useNotifStore = create<NotifState>((set, get) => ({
  items: [],
  seq: 0,
  notify: (n) => {
    const seq = get().seq + 1;
    const notif: Notification = {
      id: `n${seq}-${Date.now()}`,
      kind: n.kind,
      title: n.title,
      body: n.body,
      sentAt: Date.now(),
      burst: n.burst,
    };
    set({ seq, items: [...get().items.slice(-(MAX_KEPT - 1)), notif] });
  },
  dismiss: (id) => set({ items: get().items.filter((n) => n.id !== id) }),
  clearAll: () => set({ items: [] }),
}));