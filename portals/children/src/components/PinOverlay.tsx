import { useState } from 'react';

interface PinOverlayProps {
  title: string;
  desc: string;
  onComplete: (pin: string) => void;
  onCancel: () => void;
}

export default function PinOverlay({ title, desc, onComplete, onCancel }: PinOverlayProps) {
  const [pin, setPin] = useState('');

  const handleKey = (key: string) => {
    if (key === 'backspace') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'clear') {
      setPin('');
      return;
    }
    if (pin.length >= 4) return;
    const next = pin + key;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => onComplete(next), 200);
    }
  };

  const dots = Array.from({ length: 4 }, (_, i) => (i < pin.length ? '🟢' : '⚪')).join('');

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'clear'];

  return (
    <div id="pin-overlay" className="visible" role="dialog" aria-labelledby="pin-title" aria-modal="true">
      <div id="pin-content">
        <div id="pin-icon">🔐</div>
        <h2 id="pin-title">{title}</h2>
        <p id="pin-desc">{desc}</p>
        <div id="pin-dots">{dots}</div>
        <div id="pin-error"></div>
        <div id="pin-numpad">
          {keys.map((key) => (
            <button
              key={key}
              className={`pin-key${key === 'backspace' || key === 'clear' ? ' fn' : ''}`}
              onClick={() => handleKey(key)}
              aria-label={key === 'backspace' ? 'Backspace' : key === 'clear' ? 'Clear' : key}
            >
              {key === 'backspace' ? '⌫' : key === 'clear' ? '✕' : key}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 'var(--p31-space-sm)', marginTop: 'var(--p31-space-sm)' }}>
          <button className="button secondary" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
