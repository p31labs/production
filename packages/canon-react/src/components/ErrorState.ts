import type { CSSProperties, ReactNode } from 'react';
import { errorStateTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass } from '../reactTree.js';

export interface ErrorStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Canon action (a Button composition) rendered under the description. */
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/** ErrorState — solid error-bordered state; announced via role=alert. */
export function ErrorState({ title, description, action, className = '', style }: ErrorStateProps) {
  const tree = errorStateTree({
    title: pass(title),
    description: description != null ? pass(description) : null,
    action: action != null ? pass(action) : null,
    className,
    style,
  });
  return nodeToReact(tree);
}

export default ErrorState;