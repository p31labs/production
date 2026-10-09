import { ReactNode } from 'react';
import A2Button, { type A2ButtonProps } from './A2Button';

export interface A2CardProps {
  title?: ReactNode;
  content?: ReactNode;
  actions?: A2ButtonProps[];
  style?: React.CSSProperties;
  children?: ReactNode;
  onAction?: (action: string, payload?: unknown, el?: HTMLElement) => void;
}

export default function A2Card({ title, content, actions, style, children, onAction }: A2CardProps) {
  return (
    <div className="glass-card" style={style}>
      {title != null ? <div className="glass-card-title">{title}</div> : null}
      <div className="glass-card-body">
        <div style={{ fontSize: 12, color: 'var(--p31-text-secondary)', lineHeight: 1.5 }}>
          {content}
          {children}
        </div>
        {actions && actions.length > 0 ? (
          <div style={{ marginTop: 'var(--p31-space-tiny)', display: 'flex', gap: 'var(--p31-space-tiny)' }}>
            {actions.map((a, i) => <A2Button key={i} {...a} onAction={onAction} />)}
          </div>
        ) : null}
      </div>
    </div>
  );
}
