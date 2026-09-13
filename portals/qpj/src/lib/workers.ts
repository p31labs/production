const env = (import.meta.env as Record<string, string | undefined>) ?? {};

const pick = (key: string, fallback: string): string => env[key] || fallback;

export const GENERATE_URL = pick(
  'VITE_SANDBOX_GENERATE_URL',
  'https://vibe-generate.trimtab-signal.workers.dev/generate',
);
export const DEPLOY_URL = pick(
  'VITE_SANDBOX_DEPLOY_URL',
  'https://vibe-generate.trimtab-signal.workers.dev/deploy',
);
export const EXECUTE_URL = pick(
  'VITE_SANDBOX_EXECUTE_URL',
  'https://vibe-sandbox.trimtab-signal.workers.dev/execute',
);
export const TITLE_URL = pick(
  'VITE_SANDBOX_TITLE_URL',
  'https://chat-sandbox.trimtab-signal.workers.dev/title',
);

export const GENERATE_STREAM_URL = env.VITE_SANDBOX_STREAM_URL
  ? env.VITE_SANDBOX_STREAM_URL
  : '';
