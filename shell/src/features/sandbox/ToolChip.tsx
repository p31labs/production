import { useState } from 'react';
import type { ToolCallEvent } from '../../lib/mcpRegistry';

interface ToolChipProps {
  event: ToolCallEvent;
}

const STATUS_EMOJI: Record<string, string> = {
  pending: '\u23F3',
  running: '\u26A1',
  done: '\u2705',
  error: '\u274C',
};

export default function ToolChip({ event }: ToolChipProps) {
  const [expanded, setExpanded] = useState(false);
  const duration = event.endedAt ? `${event.endedAt - event.startedAt}ms` : null;

  return (
    <div className={`tool-chip tool-chip--${event.status}${expanded ? ' tool-chip--expanded' : ''}`}>
      <div
        className="tool-chip-header"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setExpanded(!expanded); }}
      >
        <span className="tool-chip-icon">{STATUS_EMOJI[event.status] || '\u2753'}</span>
        <span className="tool-chip-name">{event.toolName}</span>
        <span className="tool-chip-args">
          {JSON.stringify(event.args).slice(0, 60)}{JSON.stringify(event.args).length > 60 ? '\u2026' : ''}
        </span>
        {duration && <span className="tool-chip-duration">{duration}</span>}
        <span className="tool-chip-chevron">{'\u25BE'}</span>
      </div>
      <div className="tool-chip-body">
        <div style={{ marginBottom: 'var(--p31-space-tiny)', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
          Status: {event.status}
        </div>
        {event.args && Object.keys(event.args).length > 0 && (
          <div className="tool-chip-result">
            Args:{'\n'}{JSON.stringify(event.args, null, 2)}
          </div>
        )}
        {event.result != null && (
          <div className="tool-chip-result" style={{ marginTop: 'var(--p31-space-tiny)' }}>
            Result:{'\n'}{typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2)}
          </div>
        )}
        {event.error && (
          <div className="tool-chip-result" style={{ marginTop: 'var(--p31-space-tiny)', color: 'var(--p31-status-error)' }}>
            Error: {event.error}
          </div>
        )}
      </div>
    </div>
  );
}
