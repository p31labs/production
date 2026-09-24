import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { getDoc } from '../docStore';
import {
  buildForgePack,
  serializeFragmentToForge,
  type ForgeTheme,
} from '../forgeExport';

function makeDoc(id: string, title: string, body: Array<[string, string]>) {
  // Seed the store's doc cache so buildForgePack can read the title + body.
  const doc = getDoc(id);
  doc.getMap('meta').set('title', title);
  const frag = doc.getXmlFragment('prosemirror');
  for (const [name, text] of body) {
    const el = new Y.XmlElement(name);
    const t = new Y.XmlText();
    t.insert(0, text);
    el.insert(0, [t]);
    if (name === 'heading') el.setAttribute('level', '2');
    frag.push([el]);
  }
  return doc;
}

describe('forgeExport — serializeFragmentToForge', () => {
  it('maps paragraphs to forge para items', () => {
    const doc = makeDoc('t1', 'T', [
      ['paragraph', 'line one'],
      ['paragraph', 'line two'],
    ]);
    const items = serializeFragmentToForge(doc);
    expect(items).toEqual([
      { type: 'para', text: 'line one' },
      { type: 'para', text: 'line two' },
    ]);
  });

  it('maps headings to h1/h2 by level', () => {
    const doc = makeDoc('t2', 'T', [['heading', 'Section A'], ['paragraph', 'body']]);
    const items = serializeFragmentToForge(doc);
    expect(items[0]).toEqual({ type: 'h2', text: 'Section A' });
    expect(items[1]).toEqual({ type: 'para', text: 'body' });
  });

  it('skips empty nodes and never returns an empty body', () => {
    const doc = makeDoc('t3', 'T', []);
    const items = serializeFragmentToForge(doc);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe('forgeExport — buildForgePack', () => {
  it('produces a memo pack with the title and theme', () => {
    makeDoc('t4', 'My Doc', [['paragraph', 'hello']]);
    const { pack, filename } = buildForgePack('t4', {});
    expect(pack.kind).toBe('memo');
    expect(pack.theme).toBe('hub');
    expect(pack.body).toBeDefined();
    expect(filename).toBe('My Doc.docx');
  });

  it('switches to report/scene for the scene theme', () => {
    makeDoc('t5', 'Tech', [['paragraph', 'x']]);
    const { pack } = buildForgePack('t5', { theme: 'scene' as ForgeTheme });
    expect(pack.kind).toBe('report');
    expect(pack.theme).toBe('scene');
  });
});