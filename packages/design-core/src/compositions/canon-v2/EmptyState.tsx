import type { CSSProperties, ReactNode } from 'react';

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
  return (
    <div data-p31="empty-state" className={className} style={style}>
      <h2 data-p31="state-title">{title}</h2>
      {description && <p data-p31="state-description">{description}</p>}
      {action}
    </div>
  );
}

export default EmptyState;