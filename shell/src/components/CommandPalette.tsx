import { useState, useEffect, useMemo, useRef } from 'react';
import { useShellStore } from '../store/useShellStore';
import { useAppStore } from '../store/useAppStore';
import {
  getCommands,
  fuzzyScore,
  executeCommand,
  type Command,
  type CommandContext,
  type CommandArg,
} from '../lib/commands';
import { frecencySort } from '../lib/frecency';

export default function CommandPalette() {
  const open = useShellStore((s) => s.paletteOpen);
  const setOpen = useShellStore((s) => s.setPaletteOpen);
  const setAssistantOpen = useShellStore((s) => s.setAssistantOpen);
  const tab = useAppStore((s) => s.tab);
  const spoons = useAppStore((s) => s.spoons);
  const unread = useShellStore((s) => s.unreadCount);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [activeCmd, setActiveCmd] = useState<Command | null>(null);
  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const context: CommandContext = useMemo(() => ({ tab, spoons, unread }), [tab, spoons, unread]);
  const allCommands = useMemo(() => getCommands(context), [context]);

  const results = useMemo(() => {
    const q = query.trim();
    let base: Command[];
    if (!q) {
      base = allCommands;
    } else {
      base = allCommands
        .map((c) => ({ c, score: fuzzyScore(q, `${c.name} ${c.description}`) }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((r) => r.c);
    }
    return frecencySort(base);
  }, [query, allCommands]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(0);
    setActiveCmd(null);
    setArgValues({});
    setExecuting(false);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && !activeCmd) {
        e.preventDefault();
        const cmd = results[selected];
        if (cmd) {
          if (cmd.args?.length) {
            setActiveCmd(cmd);
            setArgValues(Object.fromEntries(cmd.args.map((a) => [a.name, a.options?.[0] ?? ''])));
          } else {
            runCommand(cmd);
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, results, selected, activeCmd]);

  async function runCommand(cmd: Command) {
    setExecuting(true);
    try {
      await executeCommand(cmd.id);
    } catch (err) {
      console.error('command failed', err);
    } finally {
      setExecuting(false);
      setOpen(false);
    }
  }

  function submitArgs() {
    if (!activeCmd) return;
    setExecuting(true);
    const args: Record<string, unknown> = {};
    for (const a of activeCmd.args ?? []) {
      const raw = argValues[a.name] ?? '';
      args[a.name] = a.type === 'number' ? Number(raw) : raw;
    }
    executeCommand(activeCmd.id, args)
      .catch((err) => console.error('command failed', err))
      .finally(() => {
        setExecuting(false);
        setActiveCmd(null);
        setOpen(false);
      });
  }

  function askAssistant() {
    setOpen(false);
    const q = query.trim();
    setAssistantOpen(true);
    if (q) {
      const { appendMessage } = useShellStore.getState();
      const { setStreaming } = useShellStore.getState();
      appendMessage({ role: 'user', content: q });
      setStreaming(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="command-palette-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div className="command-palette">
        {activeCmd ? (
          <div className="cmd-form">
            <div className="cmd-form-head">
              <span className="cmd-icon">{activeCmd.icon || '⚡'}</span>
              <span className="cmd-name">{activeCmd.name}</span>
            </div>
            <p className="cmd-form-desc">{activeCmd.description}</p>
            {activeCmd.args?.map((arg) => <ArgField key={arg.name} arg={arg} value={argValues[arg.name] ?? ''} onChange={(v) => setArgValues((s) => ({ ...s, [arg.name]: v }))} />)}
            <div className="cmd-form-actions">
              <button type="button" className="btn ghost" onClick={() => setActiveCmd(null)}>Back</button>
              <button type="button" className="btn primary" onClick={submitArgs} disabled={executing}>
                {executing ? 'Running…' : 'Run'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="cmd-input-row">
              <span className="cmd-prompt">⌘</span>
              <input
                ref={inputRef}
                type="text"
                className="cmd-input"
                placeholder="Type a command or ask a question…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd className="cmd-kbd">esc</kbd>
            </div>
            <div className="command-palette-results">
              {results.length === 0 ? (
                <button type="button" className="cmd-empty" onClick={askAssistant}>
                  <span>🤖 Ask the assistant</span>
                  <span className="cmd-empty-sub">“{query}”</span>
                </button>
              ) : (
                results.map((cmd, i) => (
                  <button
                    type="button"
                    key={cmd.id}
                    className={`command-palette-item${i === selected ? ' selected' : ''}`}
                    onMouseEnter={() => setSelected(i)}
                    onClick={() => {
                      if (cmd.args?.length) {
                        setActiveCmd(cmd);
                        setArgValues(Object.fromEntries(cmd.args.map((a) => [a.name, a.options?.[0] ?? ''])));
                      } else {
                        runCommand(cmd);
                      }
                    }}
                  >
                    <span className="cmd-icon">{cmd.icon || '⚡'}</span>
                    <span className="cmd-name">{cmd.name}</span>
                    <span className="cmd-desc">{cmd.description}</span>
                    <span className="cmd-category">{cmd.category}</span>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ArgField({ arg, value, onChange }: { arg: CommandArg; value: string; onChange: (v: string) => void }) {
  if (arg.type === 'select') {
    return (
      <label className="cmd-arg">
        <span>{arg.name}</span>
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {arg.options?.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </label>
    );
  }
  if (arg.type === 'boolean') {
    return (
      <label className="cmd-arg cmd-arg-check">
        <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} />
        <span>{arg.name}</span>
      </label>
    );
  }
  return (
    <label className="cmd-arg">
      <span>{arg.name}</span>
      <input
        type={arg.type === 'number' ? 'number' : 'text'}
        value={value}
        placeholder={arg.placeholder}
        min={arg.min}
        max={arg.max}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
