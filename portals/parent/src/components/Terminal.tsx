import { useState, useEffect, useRef } from 'react';

interface Command {
  input: string;
  output: string;
  timestamp: number;
}

const SUGGESTIONS = [
  'help',
  'status',
  'spoon set 3',
  'clear',
  'love balance',
];

export default function Terminal() {
  const [history, setHistory] = useState<Command[]>([]);
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [cmdIdx, setCmdIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  const execute = (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    let output = `Unknown: "${trimmed}". Type "help" for commands.`;

    if (trimmed === 'help') {
      output = `Commands:
  help           - Show this
  status         - System status
  spoon set <N>  - Set spoons 0-5
  love balance   - LOVE balance
  navigate <p>   - Go to page
  clear          - Clear terminal`;
    } else if (trimmed === 'status') {
      const s = document.documentElement.dataset.spoons || '3';
      output = `System: Online | Spoons: ${s}/5 | Mesh: ${(window as any).__p31HUD?.spoons ? 'Connected' : 'Disconnected'}`;
    } else if (trimmed === 'love balance') {
      output = `LOVE: ${localStorage.getItem('p31:love_balance') || '\u2014'}`;
    } else if (trimmed.startsWith('spoon set ')) {
      const v = parseInt(trimmed.split(' ')[2], 10);
      if (isNaN(v) || v < 0 || v > 5) {
        output = 'Invalid. Use 0-5.';
      } else {
        document.documentElement.dataset.spoons = String(v);
        output = `Spoons set to ${v}`;
      }
    } else if (trimmed.startsWith('navigate ')) {
      const target = trimmed.split(' ')[1];
      const btn = document.querySelector(`[data-target="${target}"]`) as HTMLButtonElement;
      if (btn) { btn.click(); output = `Navigated to ${target}`; }
      else { output = `Page "${target}" not found.`; }
    } else if (trimmed === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }

    setHistory((prev) => [...prev, { input: trimmed, output, timestamp: Date.now() }]);
    setInput('');
    setSuggestions([]);
  };

  const handleChange = (value: string) => {
    setInput(value);
    if (value.length) {
      setSuggestions(SUGGESTIONS.filter((s) => s.startsWith(value)).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { execute(input); setCmdIdx(-1); return; }
    const cmds = history.filter((h) => h.input).map((h) => h.input);
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = cmdIdx < cmds.length - 1 ? cmdIdx + 1 : cmdIdx;
      if (idx >= 0) { setCmdIdx(idx); setInput(cmds[cmds.length - 1 - idx]); }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdIdx > 0) { setCmdIdx(cmdIdx - 1); setInput(cmds[cmds.length - 1 - cmdIdx + 1] || ''); }
      else { setCmdIdx(-1); setInput(''); }
    }
  };

  return (
    <div style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        Terminal
        <span style={{ fontSize: '0.65rem', color: 'var(--site-text-dim)' }}>{history.length} cmds</span>
      </div>
      <div
        ref={containerRef}
        style={{
          maxHeight: '260px',
          overflowY: 'auto',
          fontFamily: 'var(--p31-font-mono)',
          fontSize: '0.75rem',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 'var(--p31-radius-md)',
          padding: 'var(--p31-space-sm) var(--p31-space-md)',
          minHeight: '120px',
        }}
      >
        {history.length === 0 && (
          <div style={{ color: 'var(--site-text-dim)', opacity: 0.5 }}>Type "help" to start.</div>
        )}
        {history.map((c, i) => (
          <div key={i} style={{ marginBottom: '4px' }}>
            <div style={{ color: 'var(--site-accent)' }}>$ {c.input}</div>
            <div style={{ color: 'var(--p31-text)', whiteSpace: 'pre-wrap' }}>{c.output}</div>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: 'var(--site-accent)' }}>$</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Command..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: 'var(--p31-text)',
              fontFamily: 'var(--p31-font-mono)',
              fontSize: '0.75rem',
              outline: 'none',
            }}
            autoFocus
          />
        </div>
        {suggestions.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
            {suggestions.map((s) => (
              <span
                key={s}
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--p31-radius-sm)',
                  background: 'rgba(255,255,255,0.05)',
                  fontSize: '0.65rem',
                  cursor: 'pointer',
                  border: '1px solid var(--p31-glass-border)',
                }}
                onClick={() => { setInput(s); setSuggestions([]); inputRef.current?.focus(); }}
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
