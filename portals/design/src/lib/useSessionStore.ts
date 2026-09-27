import { create } from 'zustand';

/**
 * useSessionStore — session-scoped activity counters for the Session Summary
 * (WP-2026-09-27f). Counters are REAL portal events: unique routes visited,
 * token edits (tokenLab.writeToken), snippets copied (the clipboard
 * handlers), calm presses + peak spoon level. Persisted to sessionStorage so
 * the summary reflects THIS tab-session only — never historical data.
 *
 * Radiant Patterns contract: no streaks, no leaderboards, no countdowns, no
 * return-nudges. The panel is explicit-trigger only (topbar "End session")
 * and never auto-opens.
 */
interface SessionState {
  routes: string[];
  tokenEdits: number;
  copies: number;
  calmPresses: number;
  peakSpoons: number;
  startedAt: number;
  dismissed: boolean;
  visit: (path: string) => void;
  countTokenEdit: () => void;
  countCopy: () => void;
  noteSpoons: (spoons: number) => void;
  dismiss: () => void;
  end: () => void;
}

const KEY = 'p31.design.session.v1';

function load(): Partial<SessionState> {
  if (typeof sessionStorage === 'undefined') return {};
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const initial = load();

export const useSessionStore = create<SessionState>((set, get) => ({
  routes: Array.isArray(initial.routes) ? initial.routes : [],
  tokenEdits: initial.tokenEdits ?? 0,
  copies: initial.copies ?? 0,
  calmPresses: initial.calmPresses ?? 0,
  peakSpoons: initial.peakSpoons ?? 3,
  startedAt: initial.startedAt ?? Date.now(),
  dismissed: initial.dismissed ?? false,

  visit: (path) => {
    const { routes } = get();
    if (routes.includes(path)) return;
    set({ routes: [...routes, path] });
  },
  countTokenEdit: () => set((s) => ({ tokenEdits: s.tokenEdits + 1 })),
  countCopy: () => set((s) => ({ copies: s.copies + 1 })),
  noteSpoons: (spoons) =>
    set((s) => ({
      calmPresses: s.calmPresses + (spoons === 0 ? 1 : 0),
      peakSpoons: Math.max(s.peakSpoons, spoons),
    })),
  dismiss: () => set({ dismissed: true }),
  end: () => {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
    set({ routes: [], tokenEdits: 0, copies: 0, calmPresses: 0, peakSpoons: 3, startedAt: Date.now(), dismissed: false });
  },
}));

/* Persist every mutation (session-scoped — reload keeps THIS session's data). */
useSessionStore.subscribe((s) => {
  try {
    const { routes, tokenEdits, copies, calmPresses, peakSpoons, startedAt, dismissed } = s;
    sessionStorage.setItem(KEY, JSON.stringify({ routes, tokenEdits, copies, calmPresses, peakSpoons, startedAt, dismissed }));
  } catch {
    /* counters stay in memory */
  }
});