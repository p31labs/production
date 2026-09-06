import { useState, useEffect } from 'react';

interface CaptureItem {
  id: string;
  text: string;
  at: number;
}

export default function CaptureBoard() {
  const [items, setItems] = useState<CaptureItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('capture:items') || '[]');
    } catch {
      return [];
    }
  });
  const [draft, setDraft] = useState('');

  useEffect(() => {
    localStorage.setItem('capture:items', JSON.stringify(items));
  }, [items]);

  const add = () => {
    if (!draft.trim()) return;
    setItems((prev) => [{ id: crypto.randomUUID?.() ?? Date.now().toString(36), text: draft.trim(), at: Date.now() }, ...prev]);
    setDraft('');
  };

  const del = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  return (
    <div>
      <div className="card-header">Capture Board</div>
      <div style={{ display: 'flex', gap: 'var(--p31-space-sm)', marginBottom: 'var(--p31-space-md)' }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Quick capture..."
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{
            flex: 1,
            padding: 'var(--p31-space-sm) var(--p31-space-md)',
            border: '1px solid var(--p31-glass-border)',
            borderRadius: 'var(--p31-radius-sm)',
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--p31-text)',
            fontFamily: 'var(--p31-font-sans)',
            fontSize: 'var(--p31-type-body)',
          }}
        />
        <button className="btn" onClick={add}>Add</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-xs)' }}>
        {items.length === 0 && (
          <div style={{ fontSize: 'var(--p31-type-caption)', color: 'var(--site-text-dim)', textAlign: 'center', padding: 'var(--p31-space-md)' }}>
            Nothing yet.
          </div>
        )}
        {items.map((i) => (
          <div key={i.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--p31-space-sm)',
            padding: 'var(--p31-space-sm) var(--p31-space-md)',
            borderRadius: 'var(--p31-radius-md)',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ flex: 1, fontSize: '0.85rem' }}>{i.text}</span>
            <button className="btn secondary" style={{ padding: 'var(--p31-space-xs) var(--p31-space-sm)', minHeight: '32px', minWidth: '32px', fontSize: '0.7rem' }} onClick={() => del(i.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
