import { GENERATE_URL, DEPLOY_URL, EXECUTE_URL, TITLE_URL, GENERATE_STREAM_URL } from '../../lib/workers';
export { GENERATE_URL, DEPLOY_URL, EXECUTE_URL, TITLE_URL, GENERATE_STREAM_URL };

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

export async function remoteTitle(
  firstUserMessage: string,
  firstAssistantReply: string,
): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(TITLE_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ firstUserMessage, firstAssistantReply }),
    }, 8000);
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; title?: string | null };
    return data.ok && data.title ? data.title : null;
  } catch {
    return null;
  }
}