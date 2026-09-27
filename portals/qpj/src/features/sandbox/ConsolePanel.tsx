import { useState, useEffect, useRef } from 'react';
import { Button } from '@p31ca/design-core/compositions';

interface ConsoleEntry {
  id: number;
  type: 'log' | 'warn' | 'error';
  args: string[];
}

let _entrySeq = 0;

export default function ConsolePanel() {
  const [entries, setEntries] = useState<ConsoleEntry[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'console') return;
      const payload = event.data.payload as { type?: 'log' | 'warn' | 'error'; args?: string[] };
      const rawType = payload?.type;
      const type: 'log' | 'warn' | 'error' = rawType === 'warn' || rawType === 'error' ? rawType : 'log';
      const args = Array.isArray(payload?.args) ? payload.args : [];
      setEntries((prev) => [...prev, { id: _entrySeq++, type, args }].slice(-100));
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [entries]);

  const hasErrors = entries.some((e) => e.type === 'error');

  return (
    <div className="console-panel">
      <div className="console-panel-header">
        <span>Console{hasErrors ? ' •' : ''}</span>
        <Button variant="ghost" size="sm" className="console-clear" onClick={() => setEntries([])}>Clear</Button>
      </div>
      <div className="console-panel-body" ref={listRef}>
        {entries.length === 0 && <p className="console-empty">No console output yet.</p>}
        {entries.map((entry) => (
          <div key={entry.id} className={`console-line console-line--${entry.type}`}>
            <span className="console-line-type">{entry.type}</span>
            <span className="console-line-text">{entry.args.join(' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
