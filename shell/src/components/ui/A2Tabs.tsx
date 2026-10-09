import { ReactNode, useState } from 'react';

export interface A2Tab {
  id: string;
  label: string;
  content?: ReactNode;
}

export interface A2TabsProps {
  tabs: A2Tab[];
  style?: React.CSSProperties;
}

export default function A2Tabs({ tabs, style }: A2TabsProps) {
  const [active, setActive] = useState(0);
  if (!tabs.length) return null;
  return (
    <div className="glass-card" style={{ padding: 0, overflow: 'hidden', ...style }}>
      <div role="tablist" style={{ display: 'flex', borderBottom: '1px solid var(--p31-glass-border)' }}>
        {tabs.map((t, i) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={i === active}
            aria-controls={`a2ui-tab-${t.id}`}
            id={`a2ui-tab-btn-${t.id}`}
            type="button"
            onClick={() => setActive(i)}
            style={{
              flex: 1,
              padding: 'var(--p31-space-tiny)',
              background: i === active ? 'var(--p31-glass-bg)' : 'transparent',
              border: 'none',
              color: i === active ? 'var(--p31-accent)' : 'var(--p31-text-secondary)',
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              minHeight: 40,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`a2ui-tab-${t.id}`}
          aria-labelledby={`a2ui-tab-btn-${t.id}`}
          style={{ padding: 'var(--p31-space-xs)', display: i === active ? 'block' : 'none', fontSize: 12, color: 'var(--p31-text-secondary)' }}
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
