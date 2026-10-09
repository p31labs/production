/**
 * components/ReasoningBlock.tsx — the reasoning layer of progressive disclosure.
 *
 * The proven streaming-disclosure state machine:
 *   - auto-open while reasoning streams (in_progress)
 *   - bottom-pinned live preview of the newest tokens (top fade while previewing)
 *   - auto-collapse when streaming ends to a single bounded summary line
 *   - permanent takeover by the first manual toggle (userOpen ?? streaming)
 *
 * This is the middle layer: glanceable summary → expanded reasoning → full trace.
 */
import { useEffect, useRef, useState } from 'react';

export interface ReasoningBlockProps {
  /** The streaming reasoning text (grows while in_progress). */
  text: string;
  /** Whether reasoning is still streaming. */
  streaming: boolean;
  /** Agent / engine label (e.g. "Dreamer", "Shaper"). */
  agent?: string;
  /** Elapsed seconds once finished — the "Thought for Xs" affordance. */
  durationMs?: number;
}

export function ReasoningBlock({ text, streaming, agent, durationMs }: ReasoningBlockProps) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const [autoOpen, setAutoOpen] = useState(streaming);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Streaming-disclosure machine: auto-open while streaming; collapse on end.
  useEffect(() => {
    if (streaming) setAutoOpen(true);
    else setAutoOpen(false);
  }, [streaming]);

  // open = user's explicit choice wins; else follow the streaming machine.
  const open = userOpen ?? autoOpen;
  const toggle = () => setUserOpen((v) => (v == null ? !autoOpen : !v));

  // Bottom-pin: keep the newest token visible while streaming.
  useEffect(() => {
    if (open && streaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, streaming, text]);

  const seconds = durationMs != null ? (durationMs / 1000).toFixed(1) : null;

  return (
    <div className={`reasoning${open ? ' reasoning--open' : ''}${streaming ? ' reasoning--live' : ''}`}>
      <button
        type="button"
        className="reasoning__toggle"
        onClick={toggle}
        aria-expanded={open}
        data-agent-kind="action"
        data-agent-action="shell.reasoning.toggle"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        <span className="reasoning__label">{agent ? `${agent} reasoning` : 'Reasoning'}</span>
        {seconds && <span className="reasoning__time">Thought for {seconds}s</span>}
        <span className="reasoning__caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="reasoning__body" ref={scrollRef}>
          {text ? (
            <p className="reasoning__text">{text}{streaming && <span className="reasoning__ghost" />}</p>
          ) : (
            <p className="reasoning__placeholder">{streaming ? 'Working…' : 'No reasoning recorded.'}</p>
          )}
        </div>
      )}
    </div>
  );
}