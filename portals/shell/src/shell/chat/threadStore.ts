/**
 * shell/chat/threadStore.ts — the chat thread store.
 *
 * Messages are keyed by the ledger id (a stable, monotonically-increasing
 * integer string stamped by rowToEvent) — never by array index, so prepending
 * history never shifts keys (the virtualized thread depends on this).
 *
 * The cursor is DERIVED from the ledger (the max ledger id observed during
 * hydrate/apply), never read from localStorage — the ledger is the single
 * source of truth; a second client-side cursor would drift.
 */
import { create } from 'zustand';
import type { BusEvent } from '../../bus/events';

export interface ChatMessage {
  /** Ledger row id — the stable key. */
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sessionId: string;
  /** Stable id for a streamed message across coalesced flushes. Several ledger
   *  rows share one messageKey; the thread renders ONE message for them. */
  messageKey?: string;
}

export interface ChatThreadState {
  messages: ChatMessage[];
  /** Last ledger id observed — derived from the ledger, not localStorage. */
  cursor: string | null;
  streaming: boolean;
  sessionId: string | null;
  error: string | null;
  /** Whether an older page remains (per-conversation latch). */
  hasMore: boolean;
  /** Whether a load-older fetch is in flight. */
  loadOlderInFlight: boolean;

  /** Hydrate from replayed events. Sets the cursor to the max ledger id seen. */
  hydrate(events: BusEvent[]): void;
  /** Apply one live event, deduped by ledger id; reconciles optimistic user
   *  entries when their round-tripped ledger id arrives. */
  apply(ev: BusEvent): void;
  /** Optimistically add a user message; returns its local id (reconcile it
   *  with the ledger id when the emit returns). */
  addUser(text: string, sessionId: string): string;
  /** Replace a local (optimistic) id with its confirmed ledger id. */
  reconcile(localId: string, ledgerId: string): void;
  /** Prepend a page of older messages (load-older); deduped by id. */
  loadOlder(older: ChatMessage[]): void;
  setSessionId(id: string): void;
  setHasMore(v: boolean): void;
  setLoadOlderInFlight(v: boolean): void;
  clear(): void;
}

const numericId = (id: unknown): number => Number(id) || 0;

// ── requestAnimationFrame token batching ────────────────────────────────────
// Tokens arrive faster than 60fps. Instead of one state update per token (a
// render storm), message.content events are buffered in a mutable array and
// flushed once per animation frame — one update per frame, not per token.
interface ContentEntry {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sessionId: string;
  messageKey?: string;
}
let contentBuffer: ContentEntry[] = [];
let rafHandle: number | null = null;

function applyContent(messages: ChatMessage[], cursor: string | null, c: ContentEntry): { messages: ChatMessage[]; cursor: string | null } {
  let next = messages;

  if (c.messageKey) {
    // A streamed message: every flush carries the accumulated text under the
    // same messageKey. Upsert — the newest ledger row wins, and the id first
    // seen stays the row key so a growing stream never remounts its message.
    const idx = messages.findIndex((m) => m.messageKey === c.messageKey);
    if (idx >= 0) {
      const prev = messages[idx]!;
      if (prev.text !== c.text && numericId(c.id) >= numericId(prev.id)) {
        next = [...messages];
        next[idx] = { ...prev, text: c.text };
      }
    } else {
      next = [...messages, { id: c.id, role: c.role, text: c.text, sessionId: c.sessionId, messageKey: c.messageKey }];
    }
  } else {
    // Reconcile an optimistic user entry: the round-trip carries the ledger id.
    const optimisticIdx = messages.findIndex((m) => m.id.startsWith('local-') && m.role === c.role && m.text === c.text && m.sessionId === c.sessionId);
    if (optimisticIdx >= 0) {
      next = [...messages];
      next[optimisticIdx] = { id: c.id, role: c.role, text: c.text, sessionId: c.sessionId };
    } else if (!messages.some((m) => m.id === c.id)) {
      next = [...messages, { id: c.id, role: c.role, text: c.text, sessionId: c.sessionId }];
    }
  }

  const cursor2 = String(Math.max(numericId(c.id), numericId(cursor)));
  return { messages: next, cursor: cursor2 };
}

function flushContentBuffer() {
  rafHandle = null;
  const batch = contentBuffer;
  contentBuffer = [];
  if (batch.length === 0) return;
  const state = useChatThreadStore.getState();
  let acc = { messages: state.messages, cursor: state.cursor };
  for (const c of batch) acc = applyContent(acc.messages, acc.cursor, c);
  useChatThreadStore.setState({ messages: acc.messages, cursor: acc.cursor });
}

function scheduleContentFlush() {
  if (rafHandle != null) return;
  // The frame scheduler, probed once per schedule; a 16ms timer backstops
  // environments without one. One occurrence per line, so the fallback can
  // never be swapped independently of the probe.
  const hasRaf = typeof requestAnimationFrame === 'function';
  const raf = hasRaf ? requestAnimationFrame : ((cb: FrameRequestCallback) => setTimeout(cb, 16) as unknown as number);
  rafHandle = raf(() => flushContentBuffer());
}

/** Settle the turn: drain the buffer SYNCHRONOUSLY, cancel any pending frame,
 *  then flip streaming off. Without the drain, a queued flush lands after
 *  message.ended and the thread streams forever (the stuck-Stop bug). */
function endStreaming(patch: { streaming: false; error?: string }) {
  if (rafHandle != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafHandle);
  rafHandle = null;
  if (contentBuffer.length > 0) flushContentBuffer();
  useChatThreadStore.setState({ ...patch, streaming: false });
}

export const useChatThreadStore = create<ChatThreadState>((set, get) => ({
  messages: [],
  cursor: null,
  streaming: false,
  sessionId: null,
  error: null,
  hasMore: false,
  loadOlderInFlight: false,

  hydrate(events) {
    const msgs: ChatMessage[] = [];
    const byKey = new Map<string, number>();
    for (const ev of events) {
      if (ev.type !== 'message.content') continue;
      const e = ev as unknown as { text?: string; role?: 'user' | 'assistant'; sessionId?: string; messageKey?: string };
      const id = (ev as unknown as { id?: string }).id;
      if (!id) continue;
      const text = typeof e.text === 'string' ? e.text : '';
      const messageKey = e.messageKey;
      if (messageKey) {
        // Coalesced stream: one message for N ledger rows — the highest row id
        // carries the final accumulated text, whatever order replay arrives in.
        const at = byKey.get(messageKey);
        if (at != null) {
          if (numericId(id) >= numericId(msgs[at]!.id)) msgs[at] = { ...msgs[at]!, text };
          continue;
        }
        byKey.set(messageKey, msgs.length);
        msgs.push({ id, role: e.role ?? 'assistant', text, sessionId: e.sessionId ?? '', messageKey });
        continue;
      }
      msgs.push({
        id,
        role: e.role ?? 'assistant',
        text,
        sessionId: e.sessionId ?? '',
      });
    }
    const maxId = events.reduce((m, ev) => Math.max(m, numericId((ev as unknown as { id?: string }).id)), 0);
    set({ messages: msgs, cursor: maxId > 0 ? String(maxId) : get().cursor });
  },

  apply(ev) {
    if (ev.type === 'phase.started') {
      // Both phases announce themselves: the turn is live before the first
      // token lands (Phase 1 streams nothing — this is the Stop signal).
      set({ streaming: true, error: null });
      return;
    }
    if (ev.type === 'run.resumed') {
      set({ streaming: true });
      return;
    }
    if (ev.type === 'run.interrupted') {
      // Paused for approval — not streaming. The tool block owns the next move.
      endStreaming({ streaming: false });
      return;
    }
    if (ev.type === 'run.error') {
      const e = ev as unknown as { error?: string };
      endStreaming({ streaming: false, error: e.error ?? 'run failed' });
      return;
    }
    if (ev.type === 'message.ended') {
      endStreaming({ streaming: false });
      return;
    }
    if (ev.type !== 'message.content') return;
    const e = ev as unknown as { text?: string; role?: 'user' | 'assistant'; sessionId?: string; messageKey?: string };
    const id = (ev as unknown as { id?: string }).id;
    if (!id) return;
    const text = typeof e.text === 'string' ? e.text : '';
    const sessionId = e.sessionId ?? '';
    const role = e.role ?? 'assistant';

    // Batch: buffer the content and flush once per animation frame. Dedup and
    // messageKey upserts happen in the flush (applyContent).
    contentBuffer.push({ id, role, text, sessionId, messageKey: e.messageKey });
    scheduleContentFlush();
  },

  addUser(text, sessionId) {
    const localId = `local-${crypto.randomUUID()}`;
    set({ messages: [...get().messages, { id: localId, role: 'user', text, sessionId }] });
    return localId;
  },

  reconcile(localId, ledgerId) {
    set({ messages: get().messages.map((m) => (m.id === localId ? { ...m, id: ledgerId } : m)) });
  },

  loadOlder(older) {
    const seen = new Set(get().messages.map((m) => m.id));
    const fresh = older.filter((m) => !seen.has(m.id));
    set({ messages: [...fresh, ...get().messages] });
  },

  setSessionId(id) {
    set({ sessionId: id });
  },

  setHasMore(v) {
    set({ hasMore: v });
  },

  setLoadOlderInFlight(v) {
    set({ loadOlderInFlight: v });
  },

  clear() {
    if (rafHandle != null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafHandle);
    rafHandle = null;
    contentBuffer = [];
    set({ messages: [], cursor: null, streaming: false, sessionId: null, error: null, hasMore: false, loadOlderInFlight: false });
  },
}));