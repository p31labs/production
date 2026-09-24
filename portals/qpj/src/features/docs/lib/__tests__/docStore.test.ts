/**
 * QPJ Docs — legacy-content migration + CRDT convergence.
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { migrateLegacyContent } from '../docStore';

describe('migrateLegacyContent (Y.Text → prosemirror fragment)', () => {
  it('converts legacy plain text into paragraphs', () => {
    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'line one\nline two');

    migrateLegacyContent(doc);

    const fragment = doc.getXmlFragment('prosemirror');
    expect(fragment.length).toBe(2);
    expect(((fragment.get(0) as Y.XmlElement).get(0) as Y.XmlText).toString()).toBe('line one');
    expect(((fragment.get(1) as Y.XmlElement).get(0) as Y.XmlText).toString()).toBe('line two');
    expect(doc.getText('content').toString()).toBe('');
  });

  it('tolerates a lone empty seed paragraph (migration race fix)', () => {
    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'legacy body');
    // The editor may push a seed paragraph before PGlite hydration lands.
    const fragment = doc.getXmlFragment('prosemirror');
    fragment.push([new Y.XmlElement('paragraph')]);

    migrateLegacyContent(doc);

    expect(fragment.length).toBe(1);
    expect(((fragment.get(0) as Y.XmlElement).get(0) as Y.XmlText).toString()).toBe('legacy body');
    expect(doc.getText('content').toString()).toBe('');
  });

  it('is a no-op when the fragment already has real content', () => {
    const doc = new Y.Doc();
    doc.getText('content').insert(0, 'legacy');
    const fragment = doc.getXmlFragment('prosemirror');
    const p = new Y.XmlElement('paragraph');
    p.insert(0, [new Y.XmlText()]);
    fragment.push([p]);
    const second = new Y.XmlElement('paragraph');
    second.insert(0, [new Y.XmlText()]);
    fragment.push([second]);

    migrateLegacyContent(doc);

    expect(fragment.length).toBe(2);
    expect(doc.getText('content').toString()).toBe('legacy');
  });

  it('is a no-op when there is no legacy content', () => {
    const doc = new Y.Doc();
    migrateLegacyContent(doc);
    expect(doc.getXmlFragment('prosemirror').length).toBe(0);
  });
});