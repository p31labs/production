/**
 * QPJ Sheets — cell CRDT convergence + bytea round-trip.
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

function setCell(doc: Y.Doc, row: number, col: number, value: string): void {
  const map = doc.getMap<string>('cells');
  const key = `${row}:${col}`;
  if (value === '') map.delete(key);
  else map.set(key, value);
}

function readCell(doc: Y.Doc, row: number, col: number): string {
  return doc.getMap<string>('cells').get(`${row}:${col}`) ?? '';
}

describe('sheets CRDT collaboration core', () => {
  it('converges concurrent edits to the same cell', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    setCell(a, 0, 0, 'alice');
    setCell(a, 1, 2, 'shared');
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    setCell(a, 1, 2, 'from-a');
    setCell(b, 1, 2, 'from-b');

    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    expect(readCell(a, 1, 2)).toBe(readCell(b, 1, 2));
    expect(readCell(a, 0, 0)).toBe('alice');
  });

  it('preserves distinct concurrent edits', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    setCell(a, 0, 0, 'x');
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    setCell(a, 0, 1, 'from-a');
    setCell(b, 1, 0, 'from-b');

    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    expect(readCell(a, 0, 1)).toBe('from-a');
    expect(readCell(b, 1, 0)).toBe('from-b');
  });

  it('state survives a raw Uint8Array round-trip (bytea path)', () => {
    const doc = new Y.Doc();
    setCell(doc, 0, 0, 'A1');
    setCell(doc, 3, 5, 'D6');
    doc.getMap('meta').set('title', 'Budget');
    doc.getMap('meta').set('rows', 40);

    const restored = new Y.Doc();
    Y.applyUpdate(restored, new Uint8Array(Y.encodeStateAsUpdate(doc)));

    expect(readCell(restored, 0, 0)).toBe('A1');
    expect(readCell(restored, 3, 5)).toBe('D6');
    expect(restored.getMap('meta').get('title')).toBe('Budget');
  });
});