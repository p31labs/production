/**
 * shell/chat/toolStore.ts — the tool-call store.
 *
 * Tool calls are keyed by their tool-call id (which is also the approval id).
 * The store consumes the bus: tool.call.started adds a call in `active`;
 * run.interrupted (with interruptId === toolCallId) flips it to
 * `awaitingApproval`; tool.call.resolved settles it to `completed` / `error`.
 */
import { create } from 'zustand';
import type { BusEvent } from '../../bus/events';

export type ToolStatus = 'active' | 'completed' | 'awaitingApproval' | 'error';

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args?: Record<string, unknown>;
  result?: string;
  status: ToolStatus;
  sessionId: string;
}

export interface ToolStoreState {
  calls: ToolCall[];
  apply(ev: BusEvent): void;
  clear(): void;
}

export const useToolStore = create<ToolStoreState>((set, get) => ({
  calls: [],

  apply(ev) {
    if (ev.type === 'tool.call.started') {
      const e = ev as unknown as { toolCallId: string; toolName: string; args?: Record<string, unknown>; sessionId?: string };
      const calls = get().calls;
      if (calls.some((c) => c.toolCallId === e.toolCallId)) return;
      set({ calls: [...calls, { toolCallId: e.toolCallId, toolName: e.toolName, args: e.args, status: 'active', sessionId: e.sessionId ?? '' }] });
      return;
    }
    if (ev.type === 'run.interrupted') {
      const e = ev as unknown as { interruptId: string };
      const calls = get().calls.map((c) => (c.toolCallId === e.interruptId ? { ...c, status: 'awaitingApproval' as ToolStatus } : c));
      set({ calls });
      return;
    }
    if (ev.type === 'tool.call.resolved') {
      const e = ev as unknown as { toolCallId: string; status: 'ok' | 'denied' | 'error'; result?: string };
      const status: ToolStatus = e.status === 'ok' ? 'completed' : 'error';
      const calls = get().calls.map((c) => (c.toolCallId === e.toolCallId ? { ...c, status, result: e.result } : c));
      set({ calls });
    }
  },

  clear() {
    set({ calls: [] });
  },
}));