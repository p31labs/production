import { useState, useRef, useEffect } from 'react';
import type { AgentId } from './sandboxStore';

interface AgentDef {
  id: AgentId;
  name: string;
  desc: string;
}

const AGENTS: AgentDef[] = [
  { id: 'mechanic', name: 'Mechanic', desc: 'Sonnet — builds things' },
  { id: 'narrator', name: 'Narrator', desc: 'Godmother — tells stories' },
  { id: 'firmware', name: 'Firmware', desc: 'Real‑time systems' },
  { id: 'architect', name: 'Architect', desc: 'System design' },
];

interface AgentSelectorProps {
  className?: string;
  active: AgentId;
  onChange: (agent: AgentId) => void;
}

export default function AgentSelector({ className, active, onChange }: AgentSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeAgent = AGENTS.find((a) => a.id === active) || AGENTS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className={`agent-selector ${className || ''}`} ref={ref}>
      <button type="button" className="agent-selector-trigger" onClick={() => setOpen(!open)}>
        <span>{activeAgent.name}</span>
        <span style={{ fontSize: 10, color: 'var(--p31-text-tertiary)' }}>▾</span>
      </button>
      {open && (
        <div className="agent-selector-popover">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`agent-selector-option${a.id === active ? ' agent-selector-option--active' : ''}`}
              onClick={() => { onChange(a.id); setOpen(false); }}
            >
              <div>
                <div className="agent-selector-option-name">{a.name}</div>
                <div className="agent-selector-option-desc">{a.desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
