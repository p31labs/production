// useHistoryStore.ts — small undo/back history (W3C COGA o4p02 "Let Users Go Back").
// Records mutating actions (spoons / theme / age / panel) at the store-subscription
// layer in App.tsx, and exposes undo() for ⌘Z/Ctrl+Z and the topbar Undo chip.
import { create } from 'zustand';

export type HistoryKind = 'spoons' | 'theme' | 'age' | 'panel';

interface HistoryEntry {
  id: number;
  kind: HistoryKind;
  label: string;
  undo: () => void;
}

interface HistoryState {
  entries: HistoryEntry[];
  isUndoing: boolean;
  record: (kind: HistoryKind, label: string, undo: () => void) => void;
  undo: () => void;
  clear: () => void;
}

const MAX_ENTRIES = 30;
let nextId = 1;

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  entries: [],
  isUndoing: false,

  record: (kind, label, undo) =>
    set((state) => ({
      entries: [...state.entries, { id: nextId++, kind, label, undo }].slice(-MAX_ENTRIES),
    })),

  undo: () => {
    const { entries, isUndoing } = get();
    if (isUndoing || entries.length === 0) return;
    const entry = entries[entries.length - 1];
    set({ isUndoing: true });
    try {
      entry.undo();
    } finally {
      set({ isUndoing: false, entries: entries.slice(0, -1) });
    }
  },

  clear: () => set({ entries: [] }),
}));
