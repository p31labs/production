import { CSSProperties, ReactNode } from 'react';
import A2Button, { type A2ButtonProps } from './A2Button';

export interface A2ModalProps {
  title?: ReactNode;
  content?: ReactNode;
  children?: ReactNode;
  actions?: A2ButtonProps[];
  visible?: boolean;
  style?: CSSProperties;
  onAction?: (action: string, payload?: unknown, el?: HTMLElement) => void;
  onClose?: () => void;
}

export default function A2Modal({ title, content, children, actions, visible = true, style, onAction, onClose }: A2ModalProps) {
  if (visible === false) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a2ui-modal-title"
      className="a2-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="glass-card a2-modal-card" style={{ ...style }}>
        <div className="glass-card-body">
          {title != null ? <h3 id="a2ui-modal-title" style={{ fontSize: 'var(--p31-scale-sm)', fontWeight: 600, margin: '0 0 var(--p31-space-tiny)', color: 'var(--p31-text)' }}>{title}</h3> : null}
          <div style={{ fontSize: 'var(--p31-scale-sm)', color: 'var(--p31-text-secondary)', lineHeight: 1.5 }}>{content}{children}</div>
          {actions && actions.length > 0 ? (
            <div style={{ display: 'flex', gap: 'var(--p31-space-tiny)', justifyContent: 'flex-end', marginTop: 'var(--p31-space-tiny)' }}>
              {actions.map((a, i) => <A2Button key={i} {...a} onAction={onAction} />)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
