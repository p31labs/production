import * as Y from 'yjs';
import { create } from 'zustand';

export interface CommentThread {
  id: string;
  anchorStart: string;
  anchorEnd: string;
  quoted: string;
  authorDid: string;
  body: string;
  state: 'open' | 'resolved' | 'reopened';
  createdAt: string;
}

export function threadsOf(doc: Y.Doc): Y.Map<CommentThread> {
  return doc.getMap<CommentThread>('threads');
}

interface CommentStoreState {
  threads: Record<string, CommentThread>;
  activeId: string | null;
  setThreads: (threads: Record<string, CommentThread>) => void;
  setActive: (activeId: string | null) => void;
}

export const useCommentStore = create<CommentStoreState>((set) => ({
  threads: {},
  activeId: null,
  setThreads: (threads) => set({ threads }),
  setActive: (activeId) => set({ activeId }),
}));