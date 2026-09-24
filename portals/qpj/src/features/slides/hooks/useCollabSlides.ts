/**
 * @file useCollabSlides.ts — Bind a deck UI to a Yjs ordered slide array.
 */

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { getSlideDoc, persistDeck } from '../lib/slideStore';

export interface SlideBlock {
  id: string;
  title: string;
  body: string;
}

export function useCollabSlides(deckId: string) {
  const [slides, setSlides] = useState<SlideBlock[]>([]);
  const docRef = useRef<Y.Doc | null>(null);
  const arrayRef = useRef<Y.Array<Y.Map<unknown>> | null>(null);

  useEffect(() => {
    if (!deckId) {
      setSlides([]);
      return;
    }
    const doc = getSlideDoc(deckId);
    const slidesArray = doc.getArray<Y.Map<unknown>>('slides');
    docRef.current = doc;
    arrayRef.current = slidesArray;

    const read = (): SlideBlock[] =>
      slidesArray
        .toArray()
        .map((m, i) => ({
          id: `s${i}`,
          title: (m.get('title') as Y.Text | undefined)?.toString() ?? '',
          body: (m.get('body') as Y.Text | undefined)?.toString() ?? '',
        }));

    const persistHandler = () => persistDeck(deckId, doc);
    const observer = () => {
      setSlides(read());
      persistHandler();
    };

    setSlides(read());
    slidesArray.observe(observer);
    doc.on('update', persistHandler);

    return () => {
      slidesArray.unobserve(observer);
      doc.off('update', persistHandler);
    };
  }, [deckId]);

  const addSlide = (): void => {
    const arr = arrayRef.current;
    if (!arr) return;
    const slide = new Y.Map<unknown>();
    slide.set('title', new Y.Text('New slide'));
    slide.set('body', new Y.Text(''));
    arr.push([slide]);
  };

  const removeSlide = (index: number): void => {
    const arr = arrayRef.current;
    if (!arr || arr.length === 0) return;
    arr.delete(index, 1);
  };

  const moveSlide = (from: number, to: number): void => {
    const arr = arrayRef.current;
    if (!arr || from === to) return;
    const slide = arr.get(from);
    if (!slide) return;
    arr.delete(from, 1);
    arr.insert(Math.min(to, arr.length), [slide]);
  };

  const setTitle = (index: number, value: string): void => {
    const arr = arrayRef.current;
    const m = arr?.get(index);
    const text = m?.get('title') as Y.Text | undefined;
    if (m && text) {
      text.delete(0, text.length);
      if (value.length > 0) text.insert(0, value);
    }
  };

  const setBody = (index: number, value: string): void => {
    const arr = arrayRef.current;
    const m = arr?.get(index);
    const text = m?.get('body') as Y.Text | undefined;
    if (m && text) {
      const cur = text.toString();
      if (cur !== value) {
        text.delete(0, cur.length);
        if (value.length > 0) text.insert(0, value);
      }
    }
  };

  return { slides, addSlide, removeSlide, moveSlide, setTitle, setBody };
}