/**
 * @file importGoogle.ts — materialize Google Docs/Sheets content into QPJ.
 *
 * Pure + testable: the functions take a `Y.Doc` so they don't need PGlite or
 * the bridge. The QPJ surface wires them to `docStore`/`sheetStore` with the
 * doc/sheet ids; the bridge supplies the exported content (Google Docs → text,
 * Google Sheets → rows).
 */

import * as Y from 'yjs';
import { getDoc } from '../../docs/lib/docStore';
import { getSheetDoc } from '../../sheets/lib/sheetStore';

/** Builds prosemirror paragraphs from plain text (replacing existing content). */
export function buildParagraphsIntoFragment(doc: Y.Doc, text: string): void {
  const fragment = doc.getXmlFragment('prosemirror');
  if (fragment.length > 0) fragment.delete(0, fragment.length);
  for (const line of text.split('\n')) {
    const paragraph = new Y.XmlElement('paragraph');
    const textNode = new Y.XmlText();
    if (line.length > 0) textNode.insert(0, line);
    paragraph.insert(0, [textNode]);
    fragment.push([paragraph]);
  }
}

/** Writes a 2D grid of cells into a sheet doc (`"row:col"` keys). */
export function importCells(doc: Y.Doc, rows: string[][]): void {
  const cells = doc.getMap<string>('cells');
  rows.forEach((row, r) => {
    row.forEach((value, c) => {
      const key = `${r}:${c}`;
      if (value === '') cells.delete(key);
      else cells.set(key, value);
    });
  });
}

/** Google Sheets CSV export → row-major 2D array (RFC 4180-ish). */
export function parseSheetCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function importTextIntoDoc(docId: string, text: string): void {
  buildParagraphsIntoFragment(getDoc(docId), text);
}

export function importCellsIntoSheet(sheetId: string, rows: string[][]): void {
  importCells(getSheetDoc(sheetId), rows);
}