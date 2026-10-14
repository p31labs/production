import type { CSSProperties, ReactNode } from 'react';

export type PageMode = 'flow' | 'fill' | 'panel-scroll' | 'fit';

export interface PageProps {
  /**
   * flow         document scroll — width-capped column (default).
   * fill         viewport app — fills its container; [data-p31-grow] child
   *              is the one scrolling region.
   * panel-scroll document page with ONE internal scrolling panel.
   * fit          single-screen-fit — alias of fill for now.
   */
  mode?: PageMode;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Page — the canon v2 page modes. The fill/flow conflation was the root
 * cause of the 560px select bug: a fill surface rendered inside a flow
 * page. One mode per page; no global html/body height shell on flow.
 */
export function Page({ mode = 'flow', children, className = '', style }: PageProps) {
  return (
    <div data-p31="page" data-mode={mode} className={className} style={style}>
      {children}
    </div>
  );
}

export interface PagePanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** The single scrolling panel of a panel-scroll page. */
export function PagePanel({ children, className = '', style }: PagePanelProps) {
  return <div data-p31="page-panel" className={className} style={style}>{children}</div>;
}

export default Page;