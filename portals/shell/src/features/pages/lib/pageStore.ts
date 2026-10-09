/**
 * @file pageStore.ts — zustand store for the Pages tree + cursor.
 */

import { create } from 'zustand';

export interface Page {
  id: string;
  title: string;
  spaceId?: string;
  parentPageId?: string;
  trashedAt?: string;
}

export interface PageNode extends Page {
  children: PageNode[];
}

interface PageState {
  pages: Page[];
  cursor: string | null;
  setPages: (pages: Page[]) => void;
  appendPage: (page: Page) => void;
  setCursor: (cursor: string | null) => void;
}

export const usePageStore = create<PageState>((set) => ({
  pages: [],
  cursor: null,
  setPages: (pages) => set({ pages }),
  appendPage: (page) => set((state) => ({ pages: [...state.pages, page] })),
  setCursor: (cursor) => set({ cursor }),
}));

/**
 * One O(n) pass: index every page by id, then push each page into its parent's
 * children array. Pages whose parent is missing fall back to the root list.
 */
export function buildTree(pages: Page[]): PageNode[] {
  const byId = new Map<string, PageNode>();
  for (const page of pages) {
    byId.set(page.id, { ...page, children: [] });
  }

  const roots: PageNode[] = [];
  for (const page of pages) {
    const node = byId.get(page.id) as PageNode;
    const parentId = page.parentPageId;
    const parent = parentId ? byId.get(parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}