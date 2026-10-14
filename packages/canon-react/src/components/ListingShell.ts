import type { CSSProperties, ReactNode } from 'react';
import { listingShellTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

export interface ListingShellProps {
  /** Search + filter row — canon Fields compose here. */
  controls?: ReactNode;
  /** Card grid children (GlassCard / Card compositions). */
  children: ReactNode;
  /** Rendered instead of the grid when children are empty. */
  empty?: ReactNode;
  emptyTitle?: ReactNode;
  emptyDescription?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** ListingShell — the discover/search pattern (controls + grid + empty). */
export function ListingShell({ controls, children, empty, emptyTitle = 'Nothing here yet', emptyDescription, className = '', style }: ListingShellProps) {
  const tree = listingShellTree({
    controls: controls != null ? pass(controls) : null,
    children: children != null ? pass(children) : null,
    empty: empty != null ? pass(empty) : null,
    emptyTitle: pass(emptyTitle),
    emptyDescription: emptyDescription != null ? pass(emptyDescription) : null,
    className,
    style,
  });
  return nodeToReact(tree);
}

export default ListingShell;