import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { dialogTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass, withHandlers, type MarkupNodeLike } from '../reactTree.js';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  labelledBy?: string;
  className?: string;
  style?: CSSProperties;
}

/** Dialog — the canon v2 modal. Escape closes; focus lands on the panel. */
export function Dialog({ open, onClose, title, children, labelledBy, className = '', style }: DialogProps) {
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
  const tree = dialogTree({
    open,
    title: pass(title),
    children: children != null ? pass(children) : null,
    labelledBy,
    className,
    style,
  })!;
  // focus the panel
  const panel = tree.children[0] as MarkupNodeLike;
  withHandlers(panel, { ref: panelRef });
  return nodeToReact(tree);
}

export default Dialog;