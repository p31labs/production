/**
 * @file useCollabSheet.ts — Bind a React grid to a Yjs `Y.Map` of cells.
 */

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { getSheetDoc, persistSheet } from '../lib/sheetStore';

export interface GridDimensions {
  rows: number;
  cols: number;
}

export function useCollabSheet(docId: string) {
  const [cells, setCells] = useState<Map<string, string>>(new Map());
  const [dims, setDims] = useState<GridDimensions>({ rows: 20, cols: 10 });
  const docRef = useRef<Y.Doc | null>(null);
  const mapRef = useRef<Y.Map<string> | null>(null);

  useEffect(() => {
    if (!docId) {
      setCells(new Map());
      setDims({ rows: 20, cols: 10 });
      return;
    }
    const doc = getSheetDoc(docId);
    const cellsMap = doc.getMap<string>('cells');
    const meta = doc.getMap('meta');
    docRef.current = doc;
    mapRef.current = cellsMap;

    const sync = () => {
      setCells(new Map(cellsMap.entries()));
      const rows = meta.get('rows');
      const cols = meta.get('cols');
      setDims({
        rows: typeof rows === 'number' ? rows : 20,
        cols: typeof cols === 'number' ? cols : 10,
      });
    };

    const persistHandler = () => persistSheet(docId, doc);
    const observer = () => {
      sync();
      persistHandler();
    };

    sync();
    cellsMap.observe(observer);
    meta.observe(observer);
    doc.on('update', persistHandler);

    return () => {
      cellsMap.unobserve(observer);
      meta.unobserve(observer);
      doc.off('update', persistHandler);
    };
  }, [docId]);

  const setCell = (row: number, col: number, value: string): void => {
    const map = mapRef.current;
    if (!map) return;
    const key = `${row}:${col}`;
    if (value === '') map.delete(key);
    else map.set(key, value);
  };

  const setDimensions = (rows: number, cols: number): void => {
    const doc = docRef.current;
    if (!doc) return;
    const meta = doc.getMap('meta');
    meta.set('rows', rows);
    meta.set('cols', cols);
    persistSheet(docId, doc);
    setDims({ rows, cols });
  };

  const getCell = (row: number, col: number): string => cells.get(`${row}:${col}`) ?? '';

  return { cells, getCell, setCell, dims, setDimensions };
}