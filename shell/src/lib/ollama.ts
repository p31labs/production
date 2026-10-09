interface OllamaModel {
  name: string;
  size: string;
  modified_at: string;
}

export async function isOllamaRunning(host = 'http://127.0.0.1:11434'): Promise<boolean> {
  try {
    const res = await fetch(`${host}/api/tags`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function listOllamaModels(host = 'http://127.0.0.1:11434'): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${host}/api/tags`);
    const data = (await res.json()) as { models?: OllamaModel[] };
    return data.models ?? [];
  } catch {
    return [];
  }
}

export async function ollamaChat(
  model: string,
  messages: Array<{ role: string; content: string }>,
  opts?: { host?: string; tools?: unknown[] },
): Promise<string | null> {
  try {
    const { default: ollama } = await import('ollama/browser');
    const res = await ollama.chat({
      host: opts?.host ?? 'http://127.0.0.1:11434',
      model,
      messages: messages as Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
      tools: opts?.tools as any,
      stream: false,
    } as any);
    return (res as any)?.message?.content ?? null;
  } catch {
    return null;
  }
}
