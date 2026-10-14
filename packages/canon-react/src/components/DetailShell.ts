import type { CSSProperties, ReactNode } from 'react';
import { detailShellTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

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

/** DetailShell — the server/detail pattern (summary + actions + focus). */
export function DetailShell({ summary, focus, actions, className = '', style }: DetailShellProps) {
  const tree = detailShellTree({
    summary: pass(summary),
    focus: pass(focus),
    actions: actions != null ? pass(actions) : null,
    className,
    style,
  });
  return nodeToReact(tree);
}

export default DetailShell;