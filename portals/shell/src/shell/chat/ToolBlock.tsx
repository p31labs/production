/**
 * shell/chat/ToolBlock.tsx — the collapsible tool-call block.
 *
 * Four states: active (running), completed (ok), awaitingApproval (needs a
 * human), error (failed/denied). Consecutive same-tool calls group into one
 * block with a repeat count so a tool-heavy turn does not render a wall of
 * identical blocks. The approval affordance posts via resolveToolApproval.
 */
import { useState } from 'react';
import type { ToolCall } from './toolStore';
import { resolveToolApproval, messagesToPayload } from './useToolApproval';
import type { ChatMessage } from './threadStore';

const STATUS_LABEL: Record<string, string> = {
  active: '⟳ running',
  completed: '✓ done',
  awaitingApproval: 'needs approval',
  error: '✗ failed',
};

export interface ToolBlockProps {
  /** A group of consecutive same-tool calls (grouping is the caller's job). */
  calls: ToolCall[];
  /** The conversation, for the approval resolution payload. */
  messages: ChatMessage[];
  onResolved?: (toolCallId: string, approved: boolean) => void;
}

export function ToolBlock({ calls, messages, onResolved }: ToolBlockProps) {
  const [open, setOpen] = useState(false);
  const first = calls[0]!;
  const last = calls[calls.length - 1]!;
  const count = calls.length;
  const awaiting = last.status === 'awaitingApproval';
  const done = calls.filter((c) => c.status === 'completed').length;
  // Multi-call group, still running: show progress (done/total) instead of a
  // bare spinner, so a tool-heavy turn shows how far through the group it is.
  const statusLabel =
    last.status === 'active' && count > 1
      ? `⟳ ${done}/${count}`
      : STATUS_LABEL[last.status] ?? last.status;

  const resolve = async (approved: boolean) => {
    await resolveToolApproval({
      sessionId: last.sessionId,
      toolCallId: last.toolCallId,
      toolName: last.toolName,
      args: last.args,
      approved,
      reason: approved ? undefined : 'rejected by operator',
      messages: messagesToPayload(messages),
    });
    onResolved?.(last.toolCallId, approved);
  };

  return (
    <div className={`toolblock toolblock--${last.status}`}>
      <button
        type="button"
        className="toolblock__head"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="toolblock__name">{first.toolName}</span>
        {count > 1 && <span className="toolblock__count">×{count}</span>}
        <span className="toolblock__status">{statusLabel}</span>
        <span className="toolblock__caret" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="toolblock__body">
          <pre className="toolblock__args">{JSON.stringify(first.args ?? {}, null, 2)}</pre>
          {awaiting ? (
            <div className="toolblock__approval">
              <button type="button" className="toolblock__deny" onClick={() => void resolve(false)}>Reject</button>
              <button type="button" className="toolblock__approve" onClick={() => void resolve(true)}>Approve</button>
            </div>
          ) : (
            <p className="toolblock__result">{last.result ?? statusLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}