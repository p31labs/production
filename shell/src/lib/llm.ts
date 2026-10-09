import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { getOpenAIFunctionDefinitions, executeCommand } from './commands';
import { ensureDid } from './memory';
import { getForecast } from './spoonHistory';

const CHAT_URL = 'https://portal-chat.trimtab-signal.workers.dev/chat';
const CHAT_RESULT_URL = 'https://portal-chat.trimtab-signal.workers.dev/chat/result';
const PORTAL = 'shell';
const MAX_TOOL_ROUNDS = 3;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

export interface ChatTurn {
  content?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  turn_id?: string;
}

interface RateBucket {
  minute: number[];
  hour: number[];
}

const bucket: RateBucket = { minute: [], hour: [] };

function checkRateLimit(): boolean {
  const now = Date.now();
  bucket.minute = bucket.minute.filter((t) => now - t < 60_000);
  bucket.hour = bucket.hour.filter((t) => now - t < 3_600_000);
  if (bucket.minute.length >= 10 || bucket.hour.length >= 100) return false;
  bucket.minute.push(now);
  bucket.hour.push(now);
  return true;
}

export function buildShellContext(): Record<string, unknown> {
  const app = useAppStore.getState();
  const shell = useShellStore.getState();
  return {
    shell: {
      tab: app.tab,
      spoons: app.spoons,
      reduceMotion: app.reduceMotion,
      loveBalance: app.loveBalance?.availableBalance ?? null,
      did: app.did,
    },
    notifications: shell.notifications.slice(0, 20).map((n) => ({
      id: n.id,
      source: n.source,
      title: n.title,
      body: n.body,
      read: n.read,
    })),
    spoonsForecast: getForecast().catch(() => ({ type: 'none', message: '', confidence: 0 })),
  };
}

const CHAT_TIMEOUT = 15_000;

function createTimeoutSignal(userSignal?: AbortSignal): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('chat timed out', 'TimeoutError')), CHAT_TIMEOUT);
  const clear = () => clearTimeout(timer);

  if (userSignal) {
    if (userSignal.aborted) {
      clearTimeout(timer);
      controller.abort(userSignal.reason);
      return { signal: controller.signal, clear };
    }
    userSignal.addEventListener('abort', () => {
      clearTimeout(timer);
      controller.abort(userSignal.reason);
    }, { once: true });
  }

  return { signal: controller.signal, clear };
}

async function postChat(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ChatTurn> {
  const ts = createTimeoutSignal(signal);
  try {
    const res = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ts.signal,
    });
    if (!res.ok) {
      throw new Error(`chat failed (${res.status})`);
    }
    return (await res.json()) as ChatTurn;
  } finally {
    ts.clear();
  }
}

async function postResult(
  body: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<ChatTurn> {
  const ts = createTimeoutSignal(signal);
  try {
    const res = await fetch(CHAT_RESULT_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: ts.signal,
    });
    if (!res.ok) throw new Error(`chat/result failed (${res.status})`);
    return (await res.json()) as ChatTurn;
  } finally {
    ts.clear();
  }
}

export const SENSITIVE_COMMANDS = new Set(['spoons:set', 'spoons:rest', 'notif:clear', 'nav:dashboard', 'nav:sandbox']);

export async function sendChat(
  message: string,
  history: ChatMessage[],
  opts?: {
    signal?: AbortSignal;
    context?: Record<string, unknown>;
    portal?: string;
    onToolCall?: (name: string, args: Record<string, unknown>) => Promise<boolean> | boolean;
  },
): Promise<ChatTurn> {
  if (!checkRateLimit()) throw new Error('rate-limited — slow down a little');

  const did = await ensureDid();
  const ctx = opts?.context ?? buildShellContext();

  const functions = getOpenAIFunctionDefinitions();

  const body = {
    message,
    portal: opts?.portal ?? PORTAL,
    context: ctx,
    history,
    functions,
    did,
  };

  const turn = await postChat(body, opts?.signal);

  let current = turn;
  let rounds = 0;
  while (current.tool_calls?.length && rounds < MAX_TOOL_ROUNDS) {
    rounds++;
    const tool_results = [];
    for (const call of current.tool_calls) {
      const name = call.function?.name ?? '';
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function?.arguments ?? '{}');
      } catch {
        args = {};
      }
      const approved = opts?.onToolCall
        ? await opts.onToolCall(name, args)
        : !SENSITIVE_COMMANDS.has(name);
      if (!approved) {
        tool_results.push({
          tool_call_id: call.id,
          result: JSON.stringify({ rejected: true, error: 'User declined to run this tool' }),
        });
        continue;
      }
      const result = await runTool(name, args);
      tool_results.push({ tool_call_id: call.id, result });
    }
    const resultBody = { turn_id: current.turn_id, tool_results, did };
    current = await postResult(resultBody, opts?.signal);
  }

  return current;
}

async function runTool(
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  try {
    const out = await executeCommand(name, args ?? {});
    return JSON.stringify(out ?? 'ok');
  } catch (err) {
    return JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
  }
}

export async function abortChat(controller: AbortController): Promise<void> {
  controller.abort();
}

export interface RevealOptions {
  onTick: (text: string) => void;
  signal?: AbortSignal;
  speed?: number;
}

export async function revealText(
  full: string,
  opts: RevealOptions,
): Promise<void> {
  const { onTick, signal, speed = 8 } = opts;
  if (!full) {
    onTick('');
    return;
  }
  const app = useAppStore.getState();
  if (app.reduceMotion) {
    onTick(full);
    return;
  }

  const waitFrame = (): Promise<void> =>
    new Promise<void>((resolve) => {
      // rAF can stall in headless/test environments; chain with a 50 ms safety
      let resolved = false;
      const done = () => { if (!resolved) { resolved = true; resolve(); } };
      const rId = requestAnimationFrame(done);
      setTimeout(() => { cancelAnimationFrame(rId); done(); }, 50);
    });

  let i = 0;
  while (i < full.length) {
    if (signal?.aborted) return;
    i += speed;
    onTick(full.slice(0, i));
    await waitFrame();
  }
  onTick(full);
}

export function streamChatTurn(
  turn: ChatTurn,
  opts: { onTick: (text: string) => void; signal?: AbortSignal },
): Promise<void> {
  return revealText(turn.content ?? '', opts);
}
