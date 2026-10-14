import type { CSSProperties } from 'react';
import { tabsTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, withHandlers, type MarkupNodeLike } from '../reactTree.js';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: readonly TabItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/** Tabs — a roving-tabindex tablist on the canon control floor. */
export function Tabs({ items, activeId, onSelect, ariaLabel = 'Tabs', className = '', style }: TabsProps) {
  const tree = tabsTree({ items: [...items], activeId, ariaLabel, className, style });
  tree.children.forEach((child, i) => {
    withHandlers(child as MarkupNodeLike, { onClick: () => onSelect?.(items[i].id) });
  });
  return nodeToReact(tree);
}

export default Tabs;