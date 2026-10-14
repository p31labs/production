import type { CSSProperties, ReactNode } from 'react';

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
  return (
    <div data-p31="error-state" role="alert" className={className} style={style}>
      <h2 data-p31="state-title">{title}</h2>
      {description && <p data-p31="state-description">{description}</p>}
      {action}
    </div>
  );
}

export default ErrorState;