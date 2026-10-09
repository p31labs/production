/**
 * api/chat/stream — the two-phase chat turn.
 *
 * Phase 1 (action collection) runs NON-streamed with the tool registry offered:
 * Workers AI's JSON mode does not stream, so this pass only decides the next
 * action. Every decoded call is announced as it is decoded, and the previous
 * call settles (tool.call.resolved) before the next opens — eager, never
 * batched at stream close. A consequential call emits run.interrupted and
 * pauses the turn for approval; it does not execute.
 *
 * Phase 2 (final response) runs WITHOUT tools with `stream: true`. The tokens
 * are forwarded as coalesced message.content events under one messageKey (the
 * accumulated text replaces itself, so a replay stays one message), then
 * message.ended. Each phase is announced with phase.started so the client
 * always knows the turn is alive — no silent gap.
 *
 * The client consumes the live turn via /api/bus/stream (SSE); this Function
 * returns JSON (the turn runs server-side and appends to the ledger).
 */
import { append, type Env } from '../../_lib/ledger';
import type { BusEvent } from '../../../src/bus/events';
import { isConsequential } from '../../../src/shell/authz';
import { notifyAgentPhase } from '../../_lib/roomClient';
import { resolveKey } from '../../_lib/credentials';
import { toolByName, toolsForModel } from './tools';

const CHAT_MODEL: string = '@cf/mistralai/mistral-small-3.1-24b-instruct';
const SYSTEM_PROMPT = 'You are the P31 convergence assistant. Be concise, direct, and kind.';
/** Loop guard for the action-collection phase — a bound, not a policy. */
const MAX_ACTION_PASSES = 4;
/** Coalesce streamed prose: flush every N pieces or M characters, whichever
 *  lands first, plus one final flush at stream close. */
const FLUSH_PIECES = 16;
const FLUSH_CHARS = 48;

interface ChatBody {
  messages?: Array<{ role?: string; content?: string }>;
  sessionId?: string;
  approval?: { toolCallId: string; toolName: string; args?: Record<string, unknown>; approved: boolean; reason?: string };
}

type HistoryMsg = { role: 'user' | 'assistant'; content: string };
type Ctx = { env: Env; sessionId: string; did?: string; fingerprint?: string; enqueue: (fn: () => Promise<unknown>) => Promise<unknown> };

/** The settled payload of an executed call, closed on the next pass. */
interface PendingCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  status: 'ok' | 'error';
  result: string;
}

/** Extract a tool call from a Workers AI response.
 *
 *  PINNED SHAPE: assumes the OpenAI-compatible `tool_calls` array
 *  (`{ tool_calls: [{ name, arguments }] }`) and a JSON-string `response` shaped
 *  `{ name, arguments }`. This is the shape `@cf/mistralai/mistral-small-3.1-24b-instruct`
 *  (CHAT_MODEL) emits. A model with a different tool-call shape (singular
 *  `tool_call`, a nested `function` object) will fall through to prose — the
 *  tool call is silently dropped. Verified models only; add a case here when
 *  the model changes. */
function parseToolCall(res: Record<string, unknown>): { name: string; args: Record<string, unknown> } | null {
  const calls = res.tool_calls as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(calls) && calls.length > 0) {
    const c = calls[0];
    if (typeof c?.name === 'string' && c.name) {
      let args: Record<string, unknown> = {};
      const raw = c.arguments;
      if (typeof raw === 'string') { try { args = JSON.parse(raw); } catch { args = {}; } }
      else if (raw && typeof raw === 'object') args = raw as Record<string, unknown>;
      return { name: c.name, args };
    }
  }
  if (typeof res.response === 'string') {
    try {
      const parsed = JSON.parse(res.response) as { name?: string; arguments?: unknown };
      if (typeof parsed?.name === 'string' && parsed.name) {
        const args = (parsed.arguments && typeof parsed.arguments === 'object') ? parsed.arguments as Record<string, unknown> : {};
        return { name: parsed.name, args };
      }
    } catch { /* not JSON — it is prose */ }
  }
  return null;
}

/** Phase 1's model call: non-streamed, tool registry offered. This pass decides
 *  the next action only — it is never streamed (JSON mode cannot). */
async function runModel(ctx: Ctx, messages: HistoryMsg[]): Promise<Record<string, unknown>> {
  const res = await ctx.env.AI!.run(CHAT_MODEL, {
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    tools: toolsForModel(),
    max_tokens: 1024,
    temperature: 0.7,
  });
  // Surface token usage — the numbers the neuron charge is computed from.
  const usage = res.usage as { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cached_tokens?: number } | undefined;
  if (usage) {
    await ctx.enqueue(() => append(ctx.env, {
      type: 'model.usage',
      sessionId: ctx.sessionId,
      model: CHAT_MODEL,
      prompt_tokens: usage.prompt_tokens,
      completion_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      cached_tokens: usage.cached_tokens ?? 0,
      authorDid: ctx.did,
      fingerprint: ctx.fingerprint,
    } as BusEvent, { sessionId: ctx.sessionId, did: ctx.did, face: 'chat' }));
  }
  return res;
}

function textOf(res: Record<string, unknown>): string {
  return typeof res.response === 'string' ? res.response : (res.response != null ? JSON.stringify(res.response) : '');
}

// ── Phase 2: the streamed final response ────────────────────────────────────

interface Frame { text?: string; usage?: Record<string, number> }

/** Split one SSE line into zero or one frame. Tolerates both Workers AI's
 *  `data: {"response": "..."}` shape and the OpenAI-compatible
 *  `data: {"choices":[{"delta":{"content":"..."}}]}` shape. */
function* frameFromLine(line: string): Generator<Frame> {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data:')) return; // event:/id:/blank lines carry no token
  const data = trimmed.slice(5).trim();
  if (!data || data === '[DONE]') return;
  let obj: Record<string, unknown>;
  try { obj = JSON.parse(data) as Record<string, unknown>; } catch { return; }

  const response = obj.response;
  if (typeof response === 'string') {
    if (response) yield { text: response };
  } else if (response && typeof response === 'object') {
    yield { text: JSON.stringify(response) };
  } else {
    const choices = obj.choices as Array<{ delta?: { content?: unknown }; text?: unknown }> | undefined;
    const delta = choices?.[0]?.delta?.content ?? choices?.[0]?.text;
    if (typeof delta === 'string' && delta) yield { text: delta };
  }
  const usage = obj.usage as Record<string, number> | undefined;
  if (usage) yield { usage };
}

/** Walk whatever `env.AI.run(..., stream: true)` returned as frames. */
async function* framesOf(raw: unknown): AsyncGenerator<Frame> {
  if (raw instanceof ReadableStream) {
    const reader = raw as ReadableStream<Uint8Array | string>;
    const r = reader.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    for (;;) {
      const { done, value } = await r.read();
      if (done) break;
      buf += typeof value === 'string' ? value : decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) yield* frameFromLine(line);
    }
    if (buf) yield* frameFromLine(buf);
    return;
  }
  if (typeof raw === 'string') {
    for (const line of raw.split('\n')) yield* frameFromLine(line);
    return;
  }
  if (Array.isArray(raw)) {
    for (const item of raw) yield* framesOf(item);
    return;
  }
  if (raw && typeof raw === 'object') yield* frameFromLine(`data: ${JSON.stringify(raw)}`);
}

/** Phase 2: announce the response phase, stream the model WITHOUT tools, and
 *  forward coalesced accumulated text as message.content, then message.ended. */
async function streamFinalResponse(ctx: Ctx, history: HistoryMsg[], messageKey: string): Promise<string> {
  const { env, sessionId, enqueue } = ctx;
  await enqueue(() => append(env, { type: 'phase.started', sessionId, phase: 'response' } as BusEvent, { sessionId, face: 'chat' }));
  void notifyAgentPhase(env, sessionId, 'response');

  // No `tools` key here on purpose: JSON mode + streaming is AiError 5023.
  const raw: unknown = await env.AI!.run(CHAT_MODEL, {
    messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
    stream: true,
    max_tokens: 1024,
    temperature: 0.7,
  });

  let acc = '';
  let flushed = 0;
  let pieces = 0;
  const flush = async (partial: boolean, force = false) => {
    const text = acc;
    if (!force && text.length === flushed) return;
    flushed = text.length;
    await enqueue(() => append(env, {
      type: 'message.content',
      sessionId,
      text,
      role: 'assistant',
      messageKey,
      partial,
      authorDid: ctx.did,
    } as BusEvent, { sessionId, did: ctx.did, face: 'chat' }));
  };

  for await (const frame of framesOf(raw)) {
    if (frame.usage) {
      const usage = frame.usage;
      await enqueue(() => append(env, {
        type: 'model.usage',
        sessionId,
        model: CHAT_MODEL,
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        cached_tokens: usage.cached_tokens ?? 0,
        authorDid: ctx.did,
        fingerprint: ctx.fingerprint,
      } as BusEvent, { sessionId, did: ctx.did, face: 'chat' }));
    }
    if (!frame.text) continue;
    acc += frame.text;
    pieces += 1;
    if (pieces % FLUSH_PIECES === 0 || acc.length - flushed >= FLUSH_CHARS) await flush(true);
  }

  // The definitive row: the accumulated text with partial cleared, even when
  // the last coalesced flush already carried it.
  await flush(false, true);
  await enqueue(() => append(env, { type: 'message.ended', sessionId } as BusEvent, { sessionId, face: 'chat' }));
  void notifyAgentPhase(env, sessionId, null);
  return acc;
}

// ── Phase 1: the action-collection loop ─────────────────────────────────────

type PhaseOne =
  | { status: 'done'; history: HistoryMsg[] }
  | { status: 'approval-requested'; toolCallId: string; toolName: string; args: Record<string, unknown>; reason: string };

/** Run Phase 1: repeated non-streamed model calls until the model stops asking
 *  for actions. Each pass closes the previous call before the next opens, so a
 *  three-call turn resolves three times as the calls arrive — not once at the
 *  end. */
async function collectActions(ctx: Ctx, historyIn: HistoryMsg[]): Promise<PhaseOne> {
  const { env, sessionId, enqueue } = ctx;
  let history = historyIn;
  let pending: PendingCall | null = null;

  const settle = async (call: PendingCall) => {
    await enqueue(() => append(env, {
      type: 'tool.call.resolved',
      sessionId,
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      status: call.status,
      result: call.result,
    } as BusEvent, { sessionId, face: 'chat' }));
  };

  for (let pass = 0; pass < MAX_ACTION_PASSES; pass++) {
    // Eager close: the call from the previous pass settles here, at the top of
    // this pass — before the next model call and before the next call opens.
    if (pending) { const done = pending; pending = null; await settle(done); }

    const res = await runModel(ctx, history);
    const toolCall = parseToolCall(res);
    if (!toolCall) {
      // No action requested — Phase 1 is done. Its prose is dropped: Phase 2
      // regenerates the user-visible answer as a stream.
      return { status: 'done', history };
    }

    const tool = toolByName(toolCall.name);
    const toolCallId = crypto.randomUUID();
    await enqueue(() => append(env, { type: 'tool.call.started', sessionId, toolCallId, toolName: toolCall.name, args: toolCall.args } as BusEvent, { sessionId, face: 'chat' }));
    void notifyAgentPhase(env, sessionId, `tool:${toolCall.name}`);

    if (tool && isConsequential(tool.action)) {
      // Fail closed: a consequential tool does not execute — the client must
      // approve it. The tool-call id is the approval id.
      const reason = `${toolCall.name} is a consequential action and needs approval.`;
      await enqueue(() => append(env, { type: 'run.interrupted', sessionId, interruptId: toolCallId, reason, risk: 'high', pendingAction: tool.action } as BusEvent, { sessionId, face: 'chat' }));
      return { status: 'approval-requested', toolCallId, toolName: toolCall.name, args: toolCall.args, reason };
    }

    // Non-consequential (or unknown → treat as non-gated, but unknown tools
    // return an error result rather than execute nothing).
    let result: string;
    let status: 'ok' | 'error' = 'ok';
    if (!tool) { result = `unknown tool "${toolCall.name}"`; status = 'error'; }
    else { try { result = await tool.execute(toolCall.args); } catch (e) { result = e instanceof Error ? e.message : 'tool failed'; status = 'error'; } }

    pending = { toolCallId, toolName: toolCall.name, args: toolCall.args, status, result };
    // Resume the loop with the tool result appended to history.
    history = [...history, { role: 'assistant', content: `Tool ${toolCall.name} result: ${result}` }];
  }

  // Loop guard: settle the last executed call before the response phase.
  if (pending) { const done = pending; pending = null; await settle(done); }
  return { status: 'done', history };
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: ChatBody;
  try {
    body = (await request.json()) as ChatBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!env.AI) {
    return Response.json({ error: 'Workers AI binding is not configured' }, { status: 501 });
  }

  const sessionId = body.sessionId || crypto.randomUUID();
  const did = request.headers.get('x-p31-did') ?? undefined;

  // BYOK: resolve the user's key per call (the engine never caches a key). A
  // null resolution falls back to the workspace default (Workers AI binding).
  let fingerprint: string | undefined;
  if (did) {
    const cred = await resolveKey(env, did, 'workers-ai');
    fingerprint = cred?.fingerprint;
  }

  // Serialize appends through a single-writer promise chain — the hash chain
  // cannot branch (same as forge/stream).
  let writeQueue: Promise<unknown> = Promise.resolve();
  const enqueue: Ctx['enqueue'] = (fn) => {
    writeQueue = writeQueue.then(fn);
    return writeQueue;
  };
  const ctx: Ctx = { env, sessionId, did, fingerprint, enqueue };

  const history: HistoryMsg[] = (body.messages ?? [])
    .filter((m) => m && typeof m.content === 'string' && m.content.length > 0)
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content as string }));

  try {
    // ── Approval mode: resolve a pending consequential tool call. ──────────
    if (body.approval) {
      const { toolCallId, toolName, args, approved, reason } = body.approval;

      if (approved) {
        const tool = toolByName(toolName);
        let result: string;
        let status: 'ok' | 'error' = 'ok';
        if (!tool) { result = `unknown tool "${toolName}"`; status = 'error'; }
        else { try { result = await tool.execute(args ?? {}); } catch (e) { result = e instanceof Error ? e.message : 'tool failed'; status = 'error'; } }
        await enqueue(() => append(env, { type: 'run.resumed', sessionId, interruptId: toolCallId, outcome: 'approved' } as BusEvent, { sessionId, face: 'chat' }));
        await enqueue(() => append(env, { type: 'tool.call.resolved', sessionId, toolCallId, toolName, status, result } as BusEvent, { sessionId, face: 'chat' }));

        const next: HistoryMsg[] = [...history, { role: 'assistant', content: `Tool ${toolName} result: ${result}` }];
        await streamFinalResponse(ctx, next, crypto.randomUUID());
      } else {
        // A rejected tool returns a denied tool result to the model, so it can
        // explain the stop instead of re-calling the tool. isError: true marks
        // it as a failed result (no re-call loop).
        const deniedContent = `Denied: ${reason || 'the operator rejected the tool call.'}`;
        await enqueue(() => append(env, { type: 'run.resumed', sessionId, interruptId: toolCallId, outcome: 'rejected' } as BusEvent, { sessionId, face: 'chat' }));
        await enqueue(() => append(env, { type: 'tool.call.resolved', sessionId, toolCallId, toolName, status: 'denied', result: deniedContent } as BusEvent, { sessionId, face: 'chat' }));

        const deniedResult = { role: 'assistant' as const, content: `The tool call ${toolName} was denied. Explain why you stopped.`, isError: true };
        await streamFinalResponse(ctx, [...history, deniedResult], crypto.randomUUID());
      }

      await writeQueue;
      return Response.json({ ok: true, sessionId, note: 'approval resolved and appended to the ledger' });
    }

    // ── Turn mode: Phase 1 collects actions, Phase 2 streams the answer. ───
    if (history.length === 0) {
      return Response.json({ error: 'No messages' }, { status: 400 });
    }

    await enqueue(() => append(env, { type: 'message.started', sessionId } as BusEvent, { sessionId, face: 'chat' }));
    await enqueue(() => append(env, { type: 'phase.started', sessionId, phase: 'action' } as BusEvent, { sessionId, face: 'chat' }));
    void notifyAgentPhase(env, sessionId, 'action');

    const phaseOne = await collectActions(ctx, history);

    if (phaseOne.status === 'approval-requested') {
      // Do NOT emit message.ended — the turn is paused pending approval.
      await writeQueue;
      return Response.json({ ok: true, sessionId, ...phaseOne, note: 'approval required — turn paused' });
    }

    const text = await streamFinalResponse(ctx, phaseOne.history, crypto.randomUUID());

    await writeQueue;
    return Response.json({ ok: true, sessionId, text, note: 'turn appended to the bus ledger' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'chat failure';
    await enqueue(() => append(env, { type: 'run.error', sessionId, error: message } as BusEvent, { sessionId, face: 'chat' }));
    void notifyAgentPhase(env, sessionId, null);
    return Response.json({ error: message, sessionId }, { status: 500 });
  }
};
