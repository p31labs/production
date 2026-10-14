import type { CSSProperties, ReactNode } from 'react';
import { EmptyState } from './EmptyState';

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

/**
 * ListingShell — the discover/search pattern: a search/filter row, a card
 * grid, and the empty state. A pattern is more than the sum of its parts;
 * patterns ship WITH canon, never as face forks.
 */
export function ListingShell({ controls, children, empty, emptyTitle = 'Nothing here yet', emptyDescription, className = '', style }: ListingShellProps) {
  const isEmpty = children == null || (Array.isArray(children) && children.length === 0);
  return (
    <div data-p31="listing-shell" className={className} style={style}>
      {controls && <div data-p31="listing-controls">{controls}</div>}
      {isEmpty ? (
        empty ?? <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div data-p31="listing-grid">{children}</div>
      )}
    </div>
  );
}

export default ListingShell;