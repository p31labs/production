/**
 * shell/chat/useToolApproval.ts — the client half of the tool approval.
 *
 * Posts the resolution to /api/chat/stream in approval mode. The toolCallId is
 * the approval id — a mismatched id would be a silent no-op on the server, so
 * it is carried verbatim from the pending tool call.
 */
import { publish } from '../../bus/client';
import type { BusEvent } from '../../bus/events';
import type { ChatMessage } from './threadStore';
import { useChatThreadStore } from './threadStore';

export interface ToolApprovalResolution {
  sessionId: string;
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  approved: boolean;
  reason?: string;
  /** The current conversation, so the server can resume the model. */
  messages: Array<{ role: string; content: string }>;
}

export async function resolveToolApproval(opts: ToolApprovalResolution): Promise<boolean> {
  // The human decision is itself a ledger event — audited separately from its
  // consequence (tool.call.resolved), so the audit trail records WHO chose WHAT.
  await publish({
    type: 'tool.approval.recorded',
    sessionId: opts.sessionId,
    toolCallId: opts.toolCallId,
    approved: opts.approved,
    reason: opts.reason,
  } as BusEvent);

  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: opts.sessionId,
      messages: opts.messages,
      approval: {
        toolCallId: opts.toolCallId,
        toolName: opts.toolName,
        args: opts.args,
        approved: opts.approved,
        reason: opts.reason,
      },
    }),
  });
  if (res.ok) {
    // An approval resumes the run: the turn is live again before phase.started
    // reaches the client, so Stop must be in the DOM across that gap too.
    useChatThreadStore.setState({ streaming: true, error: null });
  } else {
    useChatThreadStore.setState({ error: 'approval could not be recorded' });
  }
  return res.ok;
}

/** Build the conversation payload from the thread store's messages. */
export function messagesToPayload(messages: ChatMessage[]): Array<{ role: string; content: string }> {
  return messages.map((m) => ({ role: m.role, content: m.text }));
}