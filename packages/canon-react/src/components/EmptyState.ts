import type { CSSProperties, ReactNode } from 'react';
import { emptyStateTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Canon action (a Button composition) rendered under the description. */
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** EmptyState — dashed-surface "nothing here" state. */
export function EmptyState({ title, description, action, className = '', style }: EmptyStateProps) {
  const tree = emptyStateTree({
    title: pass(title),
    description: description != null ? pass(description) : null,
    action: action != null ? pass(action) : null,
    className,
    style,
  });
  return nodeToReact(tree);
}

export default EmptyState;