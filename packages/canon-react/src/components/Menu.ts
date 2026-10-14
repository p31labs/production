import type { CSSProperties, ReactNode } from 'react';
import { menuTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass, withHandlers, type MarkupNodeLike } from '../reactTree.js';

export interface MenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface MenuProps {
  items: readonly MenuItem[];
  onSelect?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/** Menu — a vertical action list (role=menu / menuitem). */
export function Menu({ items, onSelect, ariaLabel, className = '', style }: MenuProps) {
  const tree = menuTree({
    items: items.map((item) => ({
      id: item.id,
      label: pass(item.label),
      icon: item.icon != null ? pass(item.icon) : null,
    })),
    ariaLabel,
    className,
    style,
  });
  tree.children.forEach((child, i) => {
    withHandlers(child as MarkupNodeLike, { onClick: () => onSelect?.(items[i].id) });
  });
  return nodeToReact(tree);
}

export default Menu;