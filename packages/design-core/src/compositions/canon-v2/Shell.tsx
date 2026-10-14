import type { CSSProperties, ReactNode } from 'react';

export interface ShellProps {
  /** Sticky top chrome — the Topbar composition or a face's own chrome. */
  topbar?: ReactNode;
  /** Side rail, rendered in the sidebar grid area (desktop only). */
  sidebar?: ReactNode;
  /** Main content — the skip link targets its container. */
  children: ReactNode;
  /** Skip-link target id (defaults to the main region id). */
  mainId?: string;
  skipLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shell — the canon v2 app frame. Attribute-scoped grid: top / (sidebar) /
 * main areas. The sidebar collapses at the mobile breakpoint; a fill-mode
 * Page inside the shell pins the shell to the viewport (no double scroll).
 */
export function Shell({ topbar, sidebar, children, mainId, skipLabel = 'Skip to content', className = '', style }: ShellProps) {
  const id = mainId ?? 'p31-main';
  const hasSidebar = Boolean(sidebar);
  return (
    <div data-p31="shell" data-has-sidebar={hasSidebar ? '' : undefined} className={className} style={style}>
      <a data-p31="skip-link" href={`#${id}`}>{skipLabel}</a>
      {topbar && <div data-p31="shell-topbar">{topbar}</div>}
      {sidebar && <aside data-p31="shell-sidebar">{sidebar}</aside>}
      <main data-p31="shell-main" id={id}>{children}</main>
    </div>
  );
}

export default Shell;