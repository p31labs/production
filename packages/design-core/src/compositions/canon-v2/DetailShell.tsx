import type { CSSProperties, ReactNode } from 'react';

export interface DetailShellProps {
  /** Left column — identity + metadata summary. */
  summary: ReactNode;
  /** Right region — the focus surface (markdown, canvas, editor). */
  focus: ReactNode;
  /** Action row under the summary (canon Buttons compose here). */
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * DetailShell — the server/detail pattern: a summary column, an action row,
 * and a focus region. Collapses to one column at the mobile breakpoint.
 */
export function DetailShell({ summary, focus, actions, className = '', style }: DetailShellProps) {
  return (
    <div data-p31="detail-shell" className={className} style={style}>
      <section data-p31="detail-summary">{summary}</section>
      {actions && <div data-p31="detail-actions">{actions}</div>}
      <section data-p31="detail-focus">{focus}</section>
    </div>
  );
}

export default DetailShell;