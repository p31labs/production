import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children?: ReactNode;
  labelledBy?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Dialog — the canon v2 modal. Escape closes; focus lands on the panel.
 * Thin wrapper: zero CSS of its own beyond the [data-p31="dialog"] contract.
 */
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
  const titleId = labelledBy ?? 'p31-dialog-title';
  return (
    <div data-p31="dialog" className={className} style={style}>
      <div ref={panelRef} data-p31="dialog-panel" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 data-p31="dialog-title" id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export default Dialog;