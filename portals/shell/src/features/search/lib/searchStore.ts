/**
 * @file searchStore.ts — zustand store for the command-palette search state.
 *
 * Request-id guard: every setQuery call increments `requestId`. A response that
 * resolves after a newer request has been issued carries the older id and is
 * discarded inside setResults, so a slow (stale) reply can never overwrite
 * fresher results. The client debounces the FTS fetch by ~150ms after the last
 * keystroke before firing, which is what makes the guard necessary.
 */

import { create } from 'zustand';

export interface SearchResult {
  rowid: number;
  event_type: string;
  text: string;
  session_id: string;
  did: string;
  face: string;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  requestId: number;
  setQuery: (query: string) => void;
  setResults: (requestId: number, results: SearchResult[]) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  requestId: 0,

  setQuery(query) {
    set((state) => ({ query, requestId: state.requestId + 1 }));
  },

  setResults(requestId, results) {
    set((state) => {
      if (requestId !== state.requestId) return state;
      return { results };
    });
  },
}));