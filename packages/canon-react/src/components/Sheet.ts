import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { sheetTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass, withHandlers, type MarkupNodeLike } from '../reactTree.js';

export type SheetSide = 'start' | 'end';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  side?: SheetSide;
  labelledBy?: string;
  className?: string;
  style?: CSSProperties;
}

/** Sheet — the canon v2 side panel (start/end). Escape closes. */
export function Sheet({ open, onClose, title, children, side = 'end', labelledBy, className = '', style }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const tree = sheetTree({
    open,
    title: pass(title),
    children: children != null ? pass(children) : null,
    side,
    labelledBy,
    className,
    style,
  })!;
  const body = tree.children[1] as MarkupNodeLike;
  withHandlers(body, { ref: panelRef });
  return nodeToReact(tree);
}

export default Sheet;