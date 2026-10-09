import { getJWT, type LoveIdentity } from '@p31ca/shared-identity';

export const GENERATE_URL = 'https://vibe-generate.trimtab-signal.workers.dev/generate';
export const DEPLOY_URL = 'https://vibe-generate.trimtab-signal.workers.dev/deploy';
export const EXECUTE_URL = 'https://vibe-sandbox.trimtab-signal.workers.dev/execute';
export const GATEWAY_URL = 'https://gateway.p31ca.org';

export const GENERATE_TIMEOUT_MS = 25000;
export const GENERATE_ATTEMPTS = 3;
export const MONITOR_TIMEOUT_MS = 15000;
export const DEPLOY_TIMEOUT_MS = 15000;

export interface ThemeTokens {
  bg: string;
  text: string;
  accent: string;
}

export function currentThemeTokens(): ThemeTokens {
  const s = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => (s.getPropertyValue(name) || fallback).trim();
  return {
    bg: get('--p31-bg', 'oklch(14% 0.014 75)'),
    text: get('--p31-text', 'oklch(93% 0.012 80)'),
    accent: get('--p31-accent', 'oklch(69% 0.14 45)'),
  };
}

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export interface GenerateResult {
  html?: string;
  url?: string;
}

export async function remoteGenerate(prompt: string, tokens?: ThemeTokens): Promise<GenerateResult | null> {
  for (let attempt = 0; attempt < GENERATE_ATTEMPTS; attempt++) {
    try {
      const res = await fetchWithTimeout(GENERATE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt, vibe: 'warm', age: 'family', ...(tokens ? { tokens } : {}) }),
      }, GENERATE_TIMEOUT_MS);
      if (res.ok) {
        return await res.json() as GenerateResult;
      }
      if (res.status < 500 && res.status !== 429) {
        return null;
      }
    } catch {
      // network error or timeout — retry with backoff
    }
    if (attempt < GENERATE_ATTEMPTS - 1) await sleep(1000 * 2 ** attempt);
  }
  return null;
}

export async function remoteMonitor(html: string): Promise<{ score?: number; duplication_pct?: number; valid?: boolean } | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(EXECUTE_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ html }),
      }, MONITOR_TIMEOUT_MS);
      if (res.ok) {
        return await res.json() as { score?: number; duplication_pct?: number; valid?: boolean };
      }
    } catch {
      // timeout or network error — one retry
    }
    if (attempt === 0) await sleep(800);
  }
  return null;
}

export async function remoteDeploy(html: string, name: string): Promise<{ url?: string } | null> {
  try {
    const res = await fetchWithTimeout(DEPLOY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ html, name }),
    }, DEPLOY_TIMEOUT_MS);
    if (res.ok) return await res.json() as { url?: string };
  } catch {
    return null;
  }
  return null;
}

// ── Gateway Chat (Lane B: wire to gateway /v1/chat/completions via JWT) ────

export async function gatewayGenerate(
  prompt: string,
  identity: LoveIdentity | null,
  onChunk: (chunk: string) => void,
  onError: (err: string) => void,
  onDone: (fullText: string) => void,
  signal?: AbortSignal,
): Promise<boolean> {
  if (!identity) {
    onError('No identity available — sign up first');
    return false;
  }

  let jwt: string;
  try {
    jwt = await getJWT(identity);
  } catch (e: any) {
    onError(`JWT auth failed: ${e?.message || String(e)}`);
    return false;
  }

  const systemPrompt = `You are the P31 Shell assistant. Generate HTML UI components matching the current theme tokens. Output ONLY valid HTML with embedded CSS.`;

  try {
    const res = await fetchWithTimeout(
      `${GATEWAY_URL}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          stream: true,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt },
          ],
        }),
        signal,
      },
      60000,
    );

    if (!res.ok) {
      const err = await res.text().catch(() => 'unknown');
      onError(`Gateway ${res.status}: ${err.slice(0, 120)}`);
      return false;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      onError('No readable stream');
      return false;
    }

    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (!line.trim()) continue;
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch {}
        }
      }
    }
    onDone(fullText.trim());
    return true;
  } catch (e: any) {
    onError(String(e?.message || e));
    return false;
  }
}
