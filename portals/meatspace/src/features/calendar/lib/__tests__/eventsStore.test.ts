/**
 * Meatspace calendar — Yjs events-store CRDT core (pure, no IndexedDB).
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

function makeEvent(id: string, title: string): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  m.set('id', id);
  m.set('title', title);
  return m;
}

function readEvents(doc: Y.Doc, date: string): string[] {
  const list = doc.getMap<Y.Array<Y.Map<unknown>>>('events').get(date);
  if (!list) return [];
  return list.toArray().map((m) => (m.get('title') as string) ?? '');
}

describe('calendar events CRDT core', () => {
  it('stores events keyed by date', () => {
    const doc = new Y.Doc();
    const map = doc.getMap<Y.Array<Y.Map<unknown>>>('events');
    const day = new Y.Array<Y.Map<unknown>>();
    day.push([makeEvent('1', 'Dentist'), makeEvent('2', 'Piano')]);
    map.set('2026-09-22', day);
    expect(readEvents(doc, '2026-09-22')).toEqual(['Dentist', 'Piano']);
  });

  it('merges concurrent events on the same date', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    const mapA = a.getMap<Y.Array<Y.Map<unknown>>>('events');
    const dayA = new Y.Array<Y.Map<unknown>>();
    dayA.push([makeEvent('1', 'base')]);
    mapA.set('2026-09-22', dayA);
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    const mapB = b.getMap<Y.Array<Y.Map<unknown>>>('events');
    const dayB = mapB.get('2026-09-22')!;
    dayB.push([makeEvent('2', 'from-a')]);
    dayA.push([makeEvent('3', 'from-b')]);

    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    const titlesA = readEvents(a, '2026-09-22').sort();
    const titlesB = readEvents(b, '2026-09-22').sort();
    expect(titlesA).toEqual(titlesB);
    expect(titlesA).toContain('from-a');
    expect(titlesA).toContain('from-b');
  });
});