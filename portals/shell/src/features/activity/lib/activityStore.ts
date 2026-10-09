/**
 * activityStore.ts — zustand store for the read-only activity feed.
 *
 * Events arrive newest-first. `prepend` merges a newer page in front of the
 * existing timeline, then collapses consecutive same-actor/same-action events
 * (within DEDUP_WINDOW_MS) into a single row whose `count` increments, so a
 * burst of identical actions reads as one entry.
 */

import { create } from 'zustand';

export interface ActivityItem {
  id: string;
  type: string;
  actor: string;
  face: string;
  sessionId: string;
  createdAt: number;
  count: number;
}

interface ActivityState {
  events: ActivityItem[];
  cursor: string | null;
  setEvents: (events: ActivityItem[]) => void;
  prepend: (events: ActivityItem[]) => void;
}

/** Collapse consecutive same-actor/same-action events that land within this
 *  many milliseconds of each other into one row with an incremented count. */
const DEDUP_WINDOW_MS = 60_000;

function normalize(item: ActivityItem): ActivityItem {
  return { ...item, count: item.count && item.count > 0 ? item.count : 1 };
}

/** Collapse consecutive same-actor/same-action rows into one counted row. */
export function dedup(events: ActivityItem[]): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const raw of events) {
    const ev = normalize(raw);
    const last = out[out.length - 1];
    const withinWindow = last !== undefined && ev.createdAt - last.createdAt <= DEDUP_WINDOW_MS;
    if (last !== undefined && withinWindow && last.actor === ev.actor && last.type === ev.type) {
      out[out.length - 1] = { ...last, count: last.count + ev.count, createdAt: ev.createdAt };
    } else {
      out.push(ev);
    }
  }
  return out;
}

function oldestId(events: ActivityItem[]): string | null {
  return events.length ? events[events.length - 1].id : null;
}

export const useActivityStore = create<ActivityState>((set) => ({
  events: [],
  cursor: null,

  setEvents(events) {
    const next = dedup(events);
    set({ events: next, cursor: oldestId(next) });
  },

  prepend(events) {
    set((state) => {
      const next = dedup([...events.map(normalize), ...state.events]);
      return { events: next, cursor: oldestId(next) };
    });
  },
}));