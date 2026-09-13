import { useState } from 'react';
import type { ToolCallEvent } from '../../lib/mcpRegistry';

interface ToolChipProps {
  event: ToolCallEvent;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending',
  running: 'Running',
  done: 'Done',
  error: 'Error',
};

export default function ToolChip({ event }: ToolChipProps) {
  const [expanded, setExpanded] = useState(false);
  const duration = event.endedAt ? `${event.endedAt - event.startedAt}ms` : null;

  return (
    <div className={`tool-chip tool-chip--${event.status}${expanded ? ' tool-chip--expanded' : ''}`}>
      <button
        type="button"
        className="tool-chip-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="tool-chip-status" aria-label={`Status: ${STATUS_LABEL[event.status] || event.status}`}>{STATUS_LABEL[event.status] || event.status}</span>
        <span className="tool-chip-name">{event.toolName}</span>
        <span className="tool-chip-args">
          {JSON.stringify(event.args).slice(0, 60)}{JSON.stringify(event.args).length > 60 ? '…' : ''}
        </span>
        {duration && <span className="tool-chip-duration">{duration}</span>}
        <span className="tool-chip-chevron" aria-hidden="true">{expanded ? '▴' : '▾'}</span>
      </button>
      <div className="tool-chip-body">
        <div className="tool-chip-meta">
          Status: {event.status}
        </div>
        {event.args && Object.keys(event.args).length > 0 && (
          <div className="tool-chip-result tool-chip-result-gap">
            Args:
{JSON.stringify(event.args, null, 2)}
          </div>
        )}
        {event.result != null && (
          <div className="tool-chip-result tool-chip-result-gap">
            Result:
{typeof event.result === 'string' ? event.result : JSON.stringify(event.result, null, 2)}
          </div>
        )}
        {event.error && (
          <div className="tool-chip-result tool-chip-result-gap tool-chip-result--error">
            Error: {event.error}
          </div>
        )}
      </div>
    </div>
  );
}
