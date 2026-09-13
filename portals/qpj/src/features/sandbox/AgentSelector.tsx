import { useState, useRef, useEffect } from 'react';
import type { AgentId } from './sandboxStore';
import { Button } from '@p31/design-core/compositions';

interface AgentDef {
  id: AgentId;
  name: string;
  desc: string;
}

const AGENTS: AgentDef[] = [
  { id: 'mechanic', name: 'Mechanic', desc: 'Sonnet — builds things' },
  { id: 'narrator', name: 'Narrator', desc: 'Godmother — tells stories' },
  { id: 'firmware', name: 'Firmware', desc: 'Real-time systems' },
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
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="true">
        {activeAgent.name}
        <span className="agent-selector-chevron" aria-hidden="true">▾</span>
      </Button>
      {open && (
        <div className="agent-selector-popover" role="menu">
          {AGENTS.map((a) => (
            <Button
              key={a.id}
              variant="ghost"
              size="sm"
              onClick={() => { onChange(a.id); setOpen(false); }}
              aria-current={a.id === active ? 'true' : undefined}
              role="menuitem"
              className={`agent-selector-option${a.id === active ? ' agent-selector-option--active' : ''}`}
            >
              <div className="agent-option-text">
                <div className="agent-selector-option-name">{a.name}</div>
                <div className="agent-selector-option-desc">{a.desc}</div>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
