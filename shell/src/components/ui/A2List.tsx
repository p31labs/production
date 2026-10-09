import { CSSProperties } from 'react';

export interface A2ListItem {
  icon?: string;
  label: string;
  desc?: string;
  action?: string;
  payload?: unknown;
}

export interface A2ListProps {
  items: A2ListItem[];
  style?: CSSProperties;
  onAction?: (action: string, payload?: unknown, el?: HTMLElement) => void;
}

export default function A2List({ items, style, onAction }: A2ListProps) {
  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', ...style }}>
      {items.map((item, i) => (
        <div
          key={i}
          role={item.action ? 'button' : undefined}
          tabIndex={item.action ? 0 : undefined}
          data-a2ui-action={item.action || ''}
          data-a2ui-payload={item.payload !== undefined ? JSON.stringify(item.payload) : ''}
          onClick={(e) => {
            if (item.action && onAction) onAction(item.action, item.payload, e.currentTarget);
          }}
          onKeyDown={(e) => {
            if (item.action && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onAction?.(item.action, item.payload, e.currentTarget);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--p31-space-xs)',
            padding: 'var(--p31-space-tiny) var(--p31-space-xs)',
            cursor: item.action ? 'pointer' : 'default',
            borderBottom: i < items.length - 1 ? '1px solid var(--p31-glass-border)' : 'none',
            transition: 'background 0.2s',
          }}
        >
          {item.icon ? <span style={{ fontSize: 18 }}>{item.icon}</span> : null}
          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--p31-text)' }}>{item.label}</div>
            {item.desc ? <div style={{ fontSize: 10, color: 'var(--p31-text-secondary)' }}>{item.desc}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
