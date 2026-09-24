/**
 * @file useDocOutline.ts — derive a heading outline from the prosemirror
 * XML fragment (prototype's Docs outline pane, made real).
 */

import { useEffect, useState } from 'react';
import * as Y from 'yjs';
import { getDoc } from '../lib/docStore';

export interface OutlineItem {
  level: number;
  text: string;
}

export function useDocOutline(docId: string): { items: OutlineItem[] } {
  const [items, setItems] = useState<OutlineItem[]>([]);

  useEffect(() => {
    if (!docId) {
      setItems([]);
      return;
    }
    const doc = getDoc(docId);
    const fragment = doc.getXmlFragment('prosemirror');

    const read = () => {
      const out: OutlineItem[] = [];
      fragment.forEach((child) => {
        const el = child as unknown as Y.XmlElement | null;
        if (!el || el.nodeName !== 'heading') return;
        const rawLevel = el.getAttribute('level');
        const level = Math.max(1, Math.min(6, Number(rawLevel ?? 1) || 1));
        let text = '';
        el.forEach((c) => {
          const t = c as unknown as Y.XmlText | null;
          if (t) text += t.toString();
        });
        const trimmed = text.trim();
        if (trimmed) out.push({ level, text: trimmed });
      });
      setItems(out);
    };

    read();
    fragment.observe(read);
    return () => fragment.unobserve(read);
  }, [docId]);

  return { items };
}

/** Scrolls the prosemirror DOM to the first block starting with `text`. */
export function scrollOutlineTo(text: string): void {
  const editor = document.querySelector('.ProseMirror');
  if (!editor) return;
  const nodes = editor.querySelectorAll('h1, h2, h3, h4, h5, h6');
  for (const node of Array.from(nodes)) {
    const own = (node as HTMLElement).innerText?.trim() ?? '';
    if (own.startsWith(text) || text.startsWith(own.slice(0, 20))) {
      (node as HTMLElement).scrollIntoView({ block: 'start', behavior: 'smooth' });
      return;
    }
  }
  editor.scrollIntoView({ block: 'start', behavior: 'smooth' });
}