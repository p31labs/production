import { useShellStore } from '../store/useShellStore';
import { executeCommand } from './commands';
import type {
  ChatCompletion,
  ChatCompletionMessageParam,
  ChatCompletionRequestNonStreaming,
  ChatCompletionTool,
  ChatCompletionToolChoiceOption,
} from '@mlc-ai/web-llm';

const MODEL_ID = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const MAX_TOOL_ROUNDS = 3;

interface LocalEngine {
  chat: (messages: Array<{ role: string; content: string }>) => Promise<string>;
  chatWithTools: (
    messages: Array<ChatCompletionMessageParam>,
    tools: Array<ChatCompletionTool>,
    toolChoice?: ChatCompletionToolChoiceOption,
  ) => Promise<ChatCompletion>;
  destroy: () => Promise<void>;
}

let enginePromise: Promise<LocalEngine> | null = null;
let engineInstance: LocalEngine | null = null;

export function isWebGpuAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!(navigator as any).gpu;
}

export function getModelId(): string {
  return MODEL_ID;
}

export function isLocalReady(): boolean {
  return engineInstance !== null;
}

async function createEngine(): Promise<LocalEngine> {
  const webllm = await import('@mlc-ai/web-llm');
  const prebuiltAppConfig = webllm.prebuiltAppConfig;
  const shell = useShellStore.getState();

  const engine = await webllm.CreateMLCEngine(
    MODEL_ID,
    {
      initProgressCallback: (p: { text: string; progress?: number }) => {
        shell.setLocalProgress(p.progress ?? null);
        shell.setLocalStatus('loading');
      },
      appConfig: {
        ...prebuiltAppConfig,
        cacheBackend: 'indexeddb' as const,
      },
    },
  );

  return {
    chat: async (messages) => {
      const reply = await engine.chat.completions.create({
        messages: messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
        max_tokens: 256,
        temperature: 0.7,
      });
      return reply.choices[0]?.message?.content ?? '';
    },
    chatWithTools: async (messages, tools, toolChoice) => {
      const request: ChatCompletionRequestNonStreaming = {
        messages,
        max_tokens: 256,
        temperature: 0.7,
      };
      if (tools?.length) request.tools = tools;
      if (toolChoice) request.tool_choice = toolChoice;
      try {
        return await engine.chat.completions.create(request);
      } catch (err) {
        if (err instanceof Error && err.name === 'UnsupportedModelIdError') {
          return await engine.chat.completions.create({
            messages,
            max_tokens: 256,
            temperature: 0.7,
          });
        }
        throw err;
      }
    },
    destroy: async () => {
      try { await engine.unload(); } catch { /* best-effort */ }
    },
  };
}

export async function initLocalEngine(): Promise<boolean> {
  if (!isWebGpuAvailable()) return false;

  const shell = useShellStore.getState();
  shell.setLocalStatus('loading');
  shell.setLocalProgress(null);

  try {
    enginePromise = enginePromise ?? createEngine();
    engineInstance = await enginePromise;
    shell.setLocalStatus('ready');
    shell.setLocalProgress(null);
    return true;
  } catch (err) {
    shell.setLocalStatus('error');
    shell.setLocalProgress(null);
    enginePromise = null;
    return false;
  }
}

export async function localChat(messages: Array<{ role: string; content: string }>): Promise<string | null> {
  if (!engineInstance) return null;
  try {
    return await engineInstance.chat(messages);
  } catch {
    return null;
  }
}

export async function localChatWithTools(
  messages: Array<ChatCompletionMessageParam>,
  tools: Array<ChatCompletionTool>,
  toolChoice?: ChatCompletionToolChoiceOption,
  maxRounds = MAX_TOOL_ROUNDS,
): Promise<string | null> {
  if (!engineInstance) return null;
  try {
    let current = await engineInstance.chatWithTools(messages, tools, toolChoice);
    let rounds = 0;
    while (current.choices[0]?.message?.tool_calls?.length && rounds < maxRounds) {
      rounds++;
      const next: Array<ChatCompletionMessageParam> = [...messages];
      const message = current.choices[0].message;
      next.push({
        role: 'assistant',
        content: message.content ?? '',
        tool_calls: message.tool_calls,
      });
      for (const call of message.tool_calls ?? []) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function?.arguments ?? '{}') as Record<string, unknown>;
        } catch {
          args = {};
        }
        let result: string;
        try {
          const out = await executeCommand(call.function?.name ?? '', args);
          result = JSON.stringify(out ?? 'ok');
        } catch (err) {
          result = JSON.stringify({ error: err instanceof Error ? err.message : String(err) });
        }
        next.push({
          role: 'tool',
          tool_call_id: call.id,
          content: result,
        });
      }
      current = await engineInstance.chatWithTools(next, tools, toolChoice);
    }
    return current.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function destroyLocalEngine(): Promise<void> {
  const inst = engineInstance;
  engineInstance = null;
  enginePromise = null;
  await inst?.destroy();
  useShellStore.getState().setLocalStatus('idle');
}
