import type { CSSProperties, ReactNode } from 'react';
import { shellTree} from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

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

/** Shell — the canon v2 app frame (React world). */
export function Shell({ topbar, sidebar, children, mainId, skipLabel = 'Skip to content', className = '', style }: ShellProps) {
  const tree = shellTree({
    topbar: topbar != null ? pass(topbar) : null,
    sidebar: sidebar != null ? pass(sidebar) : null,
    children: pass(children),
    mainId,
    skipLabel,
    className,
    style,
  });
  return nodeToReact(tree);
}

export default Shell;