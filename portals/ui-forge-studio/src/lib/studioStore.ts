/**
 * studioStore.ts — the cross-stage shared state (B1a).
 *
 * One store, read+written by both the UI and the agent surface. Mirrors the
 * CrewAI shared-state pattern: a single state object the agent and the React
 * components both read and write; edits on either side flow to the other.
 *
 * Self-contained: no external state library — a minimal create() that
 * persists to localStorage, so a half-finished flow survives reload
 * (Vivream's "one session = one evolving idea... it grows, it never resets").
 */

import { useEffect, useSyncExternalStore } from 'react';

const KEY = 'p31:ui-forge:studio';

export interface DesignBrief {
  goal: string;
  structure: string[];
  constraints: string[];
  reference?: string;
  entities: Array<{ name: string; fields: Array<{ name: string; type: string }> }>;
  actions: Array<{ name: string }>;
  title: string;
}

export interface StudioState {
  /** The natural-language brain dump the user typed. */
  nlInput: string;
  /** Stage 2 — the JSON source-of-truth brief. */
  brief: DesignBrief | null;
  /** Stage 3 — the refinement chat turns. */
  refinementHistory: Array<{ role: 'agent' | 'human'; text: string }>;
  /** Stage 4 — the compiled instance schema (component-tree JSON). */
  schema: unknown | null;
  /** Stage 5 — the forge result (rendered artifact + gate). */
  forgeResult: unknown | null;
  activeStage: 1 | 2 | 3 | 4 | 5;
}

const INITIAL: StudioState = {
  nlInput: '',
  brief: null,
  refinementHistory: [],
  schema: null,
  forgeResult: null,
  activeStage: 1,
};

let state: StudioState = load();
const listeners = new Set<() => void>();

function load(): StudioState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...INITIAL, ...JSON.parse(raw) };
  } catch { /* localStorage unavailable */ }
  return { ...INITIAL };
}

function persist(next: StudioState): StudioState {
  state = next;
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  for (const l of listeners) l();
  return state;
}

/** Tiny create-store: set a slice, persist, notify. */
export function setStudio(patch: Partial<StudioState> | ((s: StudioState) => Partial<StudioState>)): void {
  const next = typeof patch === 'function' ? patch(state) : patch;
  persist({ ...state, ...next });
}

export function getStudio(): StudioState {
  return state;
}

export function resetStudio(): void {
  persist({ ...INITIAL });
}

/** React hook — re-renders on every setStudio. */
export function useStudio(): StudioState {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );
}

/** localStorage listener for cross-tab sync (a second tab sees the same flow). */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY && e.newValue) {
      try { persist({ ...state, ...JSON.parse(e.newValue) }); } catch { /* ignore */ }
    }
  });
}

// Keep useEffect referenced so the hook contract is obvious to callers.
export { useEffect };