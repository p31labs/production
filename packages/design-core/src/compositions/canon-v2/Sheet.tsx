import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

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
  const titleId = labelledBy ?? 'p31-sheet-title';
  return (
    <div data-p31="sheet" data-side={side} role="dialog" aria-modal="true" aria-labelledby={titleId} className={className} style={style}>
      <h2 data-p31="dialog-title" id={titleId}>{title}</h2>
      <div ref={panelRef} tabIndex={-1}>{children}</div>
    </div>
  );
}

export default Sheet;