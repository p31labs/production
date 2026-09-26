import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_SECTIONS } from '../lib/nav';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

/** CommandPalette — ⌘K surface jump (suite modal). */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  const results = NAV_SECTIONS.filter((s) => s.label.toLowerCase().includes(query.toLowerCase()));

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
              if (e.key === 'Enter' && results[0]) {
                onClose();
                navigate(results[0]!.path);
              }
            }}
          />
        </div>
        <div className="palette-results">
          {results.map((s) => (
            <button
              key={s.path}
              type="button"
              className="palette-item"
              onClick={() => { onClose(); navigate(s.path) }}
            >
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