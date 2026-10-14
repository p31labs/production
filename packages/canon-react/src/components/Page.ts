import type { CSSProperties, ReactNode } from 'react';
import { pageTree, pagePanelTree} from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

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

/** Page — the canon v2 page modes (React world). */
export function Page({ mode = 'flow', children, className = '', style }: PageProps) {
  const tree = pageTree({ mode, children: pass(children), className, style });
  return nodeToReact(tree);
}

export interface PagePanelProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** The single scrolling panel of a panel-scroll page. */
export function PagePanel({ children, className = '', style }: PagePanelProps) {
  const tree = pagePanelTree({ children: pass(children), className, style });
  return nodeToReact(tree);
}

export default Page;