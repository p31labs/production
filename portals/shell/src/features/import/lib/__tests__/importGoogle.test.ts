/**
 * QPJ Import — Google Docs/Sheets → QPJ materialization (pure).
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { buildParagraphsIntoFragment, importCells, parseSheetCsv } from '../importGoogle';

describe('buildParagraphsIntoFragment', () => {
  it('materializes Google Doc text into prosemirror paragraphs', () => {
    const doc = new Y.Doc();
    buildParagraphsIntoFragment(doc, 'line one\nline two');
    const fragment = doc.getXmlFragment('prosemirror');
    expect(fragment.length).toBe(2);
    expect(((fragment.get(0) as Y.XmlElement).get(0) as Y.XmlText).toString()).toBe('line one');
  });

  it('replaces existing content when re-importing', () => {
    const doc = new Y.Doc();
    buildParagraphsIntoFragment(doc, 'first');
    buildParagraphsIntoFragment(doc, 'second');
    expect(doc.getXmlFragment('prosemirror').length).toBe(1);
    expect(
      ((doc.getXmlFragment('prosemirror').get(0) as Y.XmlElement).get(0) as Y.XmlText).toString(),
    ).toBe('second');
  });
});

describe('importCells', () => {
  it('writes a 2D grid into the sheet cell map', () => {
    const doc = new Y.Doc();
    importCells(doc, [
      ['Name', 'Age'],
      ['Ava', '7'],
    ]);
    const cells = doc.getMap<string>('cells');
    expect(cells.get('0:0')).toBe('Name');
    expect(cells.get('1:1')).toBe('7');
  });

  it('clears cells that are empty', () => {
    const doc = new Y.Doc();
    doc.getMap<string>('cells').set('0:0', 'old');
    importCells(doc, [['']]);
    expect(doc.getMap<string>('cells').has('0:0')).toBe(false);
  });
});

describe('parseSheetCsv', () => {
  it('parses simple CSV', () => {
    expect(parseSheetCsv('a,b\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('parses quoted fields with commas', () => {
    expect(parseSheetCsv('"x,y",z')).toEqual([['x,y', 'z']]);
  });
});