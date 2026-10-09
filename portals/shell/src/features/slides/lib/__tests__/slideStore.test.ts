/**
 * QPJ Slides — deck CRDT collaboration core.
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';

function makeSlide(title: string, body: string): Y.Map<unknown> {
  const m = new Y.Map<unknown>();
  const t = new Y.Text();
  const b = new Y.Text();
  t.insert(0, title);
  b.insert(0, body);
  m.set('title', t);
  m.set('body', b);
  return m;
}

function readSlides(doc: Y.Doc): { title: string; body: string }[] {
  return doc.getArray<Y.Map<unknown>>('slides').toArray().map((m) => ({
    title: (m.get('title') as Y.Text).toString(),
    body: (m.get('body') as Y.Text).toString(),
  }));
}

describe('slides CRDT collaboration core', () => {
  it('preserves slide order and content across peers', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    const arrA = a.getArray<Y.Map<unknown>>('slides');
    arrA.push([makeSlide('One', 'first'), makeSlide('Two', 'second')]);
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    expect(readSlides(b)).toEqual([
      { title: 'One', body: 'first' },
      { title: 'Two', body: 'second' },
    ]);
  });

  it('merges concurrent slide inserts deterministically', () => {
    const a = new Y.Doc();
    const b = new Y.Doc();
    const arrA = a.getArray<Y.Map<unknown>>('slides');
    arrA.push([makeSlide('Seed', '')]);
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    const arrB = b.getArray<Y.Map<unknown>>('slides');
    arrA.push([makeSlide('from-a', '')]);
    arrB.push([makeSlide('from-b', '')]);

    Y.applyUpdate(a, Y.encodeStateAsUpdate(b));
    Y.applyUpdate(b, Y.encodeStateAsUpdate(a));

    const titlesA = readSlides(a).map((s) => s.title);
    const titlesB = readSlides(b).map((s) => s.title);
    expect(titlesA).toEqual(titlesB);
    expect(titlesA).toContain('from-a');
    expect(titlesA).toContain('from-b');
  });

  it('round-trips through a raw Uint8Array (bytea path)', () => {
    const doc = new Y.Doc();
    doc.getArray<Y.Map<unknown>>('slides').push([makeSlide('Title', 'Body')]);
    doc.getMap('meta').set('title', 'My deck');

    const restored = new Y.Doc();
    Y.applyUpdate(restored, new Uint8Array(Y.encodeStateAsUpdate(doc)));

    expect(readSlides(restored)[0]).toEqual({ title: 'Title', body: 'Body' });
    expect(restored.getMap('meta').get('title')).toBe('My deck');
  });
});