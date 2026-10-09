/**
 * provider-workers-ai.mjs — the live Dreamer provider backed by the
 * catalog-driven Workers AI router.
 *
 * The Dreamer contract is `provider(prompt, opts) → Promise<string>` — a
 * JSON array of candidate component trees. This provider forwards the
 * Dreamer's self-contained prompt to `routeToWorkersAI` (the router fixed and
 * verified in PART5), selecting the model by intent instead of hardcoding.
 *
 * The engine (center.mjs) already falls back to a deterministic catalog walk
 * if the provider throws — so a live-LLM outage degrades to a valid surface,
 * never to a dead button.
 *
 * Requires (env):
 *   CLOUDFLARE_ACCOUNT_ID, CF_API_TOKEN, WORKERS_AI_FREE_TIER=1
 */
import { routeToWorkersAI } from '/home/p31/production/tools (1)/phos-forge/router.mjs';

export async function workersAiProvider(prompt, opts = {}) {
  const r = await routeToWorkersAI(
    '',                            // system — the Dreamer prompt is self-contained
    prompt,                        // user — the full role + vocab + token map
    opts.intent ?? 'codingFree',   // fc + reasoning + 128K ctx, free-tier-safe
    opts.maxTokens ?? 4096,        // reasoning models need ≥512 to not starve
    opts.temperature ?? 0.9,       // Dreamer default
    opts.timeoutMs ?? 120000,
    { reasoningEffort: 'low' },
  );
  return r.content;
}

export default workersAiProvider;