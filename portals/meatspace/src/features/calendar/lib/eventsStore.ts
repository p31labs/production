/**
 * @file eventsStore.ts — local-first collaborative family calendar (meatspace).
 *
 * A Yjs doc holds events as `Y.Map<dateISO, Y.Array<Y.Map<Event>>>`; the doc is
 * persisted to IndexedDB via y-indexeddb (meatspace already uses IndexedDB —
 * no PGlite lift). Same-device BroadcastChannel is implied by y-indexeddb's
 * cross-tab sync; cross-device can later reuse the P31 doc-relay.
 */

import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export interface CalendarEvent {
  id: string;
  title: string;
  time: string;
  notes?: string;
}

const docRef: { doc: Y.Doc | null } = { doc: null };
const persisted = new Set<string>();

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Lazily creates (and persists) the shared calendar doc. */
export function getCalendarDoc(): Y.Doc {
  if (docRef.doc) return docRef.doc;
  const doc = new Y.Doc({ gc: true });
  doc.getMap<Y.Array<Y.Map<unknown>>>('events');
  docRef.doc = doc;
  if (typeof indexedDB !== 'undefined') {
    const idb = new IndexeddbPersistence('qpj-meatspace-calendar', doc);
    idb.on('synced', () => persisted.add('idb'));
  }
  return doc;
}

export function getEventsMap(): Y.Map<Y.Array<Y.Map<unknown>>> {
  return getCalendarDoc().getMap<Y.Array<Y.Map<unknown>>>('events');
}

export function eventsForDay(date: Date): CalendarEvent[] {
  const map = getEventsMap();
  const list = map.get(dateKey(date));
  if (!list) return [];
  return list.toArray().map((m) => ({
    id: (m.get('id') as string | undefined) ?? '',
    title: (m.get('title') as string | undefined) ?? '',
    time: (m.get('time') as string | undefined) ?? '',
    notes: (m.get('notes') as string | undefined) ?? '',
  }));
}

export function addEvent(date: Date, title: string, time = '12:00'): void {
  const map = getEventsMap();
  const key = dateKey(date);
  let list = map.get(key);
  if (!list) {
    list = new Y.Array<Y.Map<unknown>>();
    map.set(key, list);
  }
  const event = new Y.Map<unknown>();
  event.set('id', crypto.randomUUID());
  event.set('title', title);
  event.set('time', time);
  list.push([event]);
}

export function removeEvent(date: Date, id: string): void {
  const map = getEventsMap();
  const list = map.get(dateKey(date));
  if (!list) return;
  for (let i = 0; i < list.length; i++) {
    if (list.get(i)?.get('id') === id) {
      list.delete(i, 1);
      return;
    }
  }
}

export function daysWithEvents(monthStart: Date, monthEnd: Date): Set<string> {
  const map = getEventsMap();
  const out = new Set<string>();
  const cursor = new Date(monthStart);
  while (cursor <= monthEnd) {
    const key = dateKey(cursor);
    const list = map.get(key);
    if (list && list.length > 0) out.add(key);
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}