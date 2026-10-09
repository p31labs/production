import { useEffect, useRef, useState } from 'react';
import { SECTIONS, type SectionId } from '../lib/nav';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (id: SectionId) => void;
}

/** CommandPalette — ⌘K surface jump + quick actions (suite modal). */
export function CommandPalette({ open, onClose, onNavigate }: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const q = query.toLowerCase();
  const results = SECTIONS.filter((s) => s.label.toLowerCase().includes(q));

  const jump = (id: SectionId) => {
    onClose();
    onNavigate(id);
  };

  return (
    <div
      className="modal-backdrop active"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-box palette-box">
        <div className="palette-input-wrap">
          <input
            ref={inputRef}
            type="text"
            className="palette-input"
            placeholder="Type a surface name or command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) jump(results[0].id);
            }}
          />
        </div>
        <div className="palette-results">
          {results.map((s) => (
            <button key={s.id} type="button" className="palette-item" onClick={() => jump(s.id)}>
              <span>{s.emoji} Jump to {s.label}</span>
            </button>
          ))}
          {results.length === 0 && (
            <div style={{ padding: 16, color: 'var(--p31-cloud)', textAlign: 'center' }}>
              No matching surfaces.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;