import { useState, useRef, useEffect, useCallback, useId } from 'react';
import type { AgentId } from './sandboxStore';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeAgent = AGENTS.find((a) => a.id === active) || AGENTS[0];
  const listboxId = useId();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const closeAndReturnFocus = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const onOptionKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (index + 1) % AGENTS.length;
      optionRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (index - 1 + AGENTS.length) % AGENTS.length;
      optionRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      optionRefs.current[AGENTS.length - 1]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeAndReturnFocus();
    } else if (e.key === 'Tab') {
      closeAndReturnFocus();
    }
  }, [closeAndReturnFocus]);

  const onTriggerKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      if (!open) {
        e.preventDefault();
        setOpen(true);
        const activeIndex = AGENTS.findIndex((a) => a.id === active);
        requestAnimationFrame(() => optionRefs.current[Math.max(0, activeIndex)]?.focus());
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        optionRefs.current[0]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) setOpen(true);
      requestAnimationFrame(() => optionRefs.current[AGENTS.length - 1]?.focus());
    } else if (e.key === 'Escape') {
      closeAndReturnFocus();
    }
  }, [open, active, closeAndReturnFocus]);

  return (
    <div className={`agent-selector ${className || ''}`} ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(!open)}
        onKeyDown={onTriggerKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
      >
        {activeAgent.name}
        <span className="agent-selector-chevron" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="agent-selector-popover" role="listbox" aria-label="Select agent" id={listboxId}>
          {AGENTS.map((a, i) => (
            <button
              key={a.id}
              type="button"
              ref={(el) => { optionRefs.current[i] = el; }}
              className={`btn btn-ghost btn-sm agent-selector-option${a.id === active ? ' agent-selector-option--active' : ''}`}
              onClick={() => { onChange(a.id); setOpen(false); triggerRef.current?.focus(); }}
              onKeyDown={(e) => onOptionKeyDown(e, i)}
              aria-selected={a.id === active}
              role="option"
              data-agent-kind="action"
              data-agent-action="chat.agent.select"
            >
              <div className="agent-option-text">
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