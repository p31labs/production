/**
 * neurons.mjs — deterministic neuron-budget accounting (Workflow A, budget
 * guard).
 *
 * From cf-proxy: "neurons ≈ prompt_tokens × rate_in + completion_tokens ×
 * rate_out. Counters reset per account at 00:00 UTC." Free tier is 10,000
 * neurons/day, account-wide, shared across the whole account.
 *
 * The router's routeToWorkersAI already returns promptTokens/completionTokens;
 * feed them here. Pure logic — no model call.
 *
 * NEURON_RATES are the Cloudflare published per-model rates (neurons per
 * MILLION tokens), captured 2026-09/10. `default` covers models not yet
 * tabulated.
 */

export const FREE_NEURONS_PER_DAY = 10000;

/** neurons per MILLION tokens (Cloudflare published rates). */
export const NEURON_RATES = {
  default: { in: 5000, out: 30000 },
  '@cf/ibm-granite/granite-4.0-h-micro': { in: 1542, out: 2800 },
  '@cf/meta/llama-3.2-1b-instruct': { in: 2457, out: 18252 },
  '@cf/meta/llama-3.2-3b-instruct': { in: 4625, out: 30475 },
  '@cf/meta/llama-3.2-11b-vision-instruct': { in: 4410, out: 61493 },
  '@cf/meta/llama-3.1-8b-instruct-fp8-fast': { in: 4119, out: 34868 },
  '@cf/qwen/qwen3-30b-a3b-fp8': { in: 4625, out: 30475 },
  '@cf/zai-org/glm-4.7-flash': { in: 5500, out: 36400 },
  '@cf/google/gemma-4-26b-a4b-it': { in: 9091, out: 27273 },
  '@cf/openai/gpt-oss-20b': { in: 18182, out: 27273 },
  '@cf/openai/gpt-oss-120b': { in: 31818, out: 68182 },
  '@cf/qwen/qwen3.8-27b': { in: 40909, out: 290909 },
  '@cf/nvidia/nemotron-3-120b-a12b': { in: 45455, out: 136364 },
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast': { in: 26668, out: 204805 },
  '@cf/qwen/qwen2.5-coder-32b-instruct': { in: 60000, out: 90909 },
  '@cf/qwen/qwq-32b': { in: 60000, out: 90909 },
  '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b': { in: 45170, out: 443756 },
};

export function estimateNeurons(promptTokens, completionTokens, model) {
  const rate = NEURON_RATES[model] ?? NEURON_RATES.default;
  return (promptTokens / 1e6) * rate.in + (completionTokens / 1e6) * rate.out;
}

/** UTC day key — the budget resets at midnight UTC, not local midnight. */
export function utcDayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export class NeuronBudget {
  constructor(limit = FREE_NEURONS_PER_DAY, now = Date.now()) {
    this.limit = limit;
    this.used = 0;
    this.day = utcDayKey(now);
  }

  _rollover(now = Date.now()) {
    const day = utcDayKey(now);
    if (day !== this.day) {
      this.day = day;
      this.used = 0;
    }
  }

  /** Spend an estimate. Returns { used, remaining, ok }. */
  spend(estimate, now = Date.now()) {
    this._rollover(now);
    this.used += estimate;
    return { used: this.used, remaining: this.limit - this.used, ok: this.used <= this.limit };
  }

  /** Pre-flight check: would spending this estimate exceed the daily cap? */
  wouldExceed(estimate, now = Date.now()) {
    this._rollover(now);
    return this.used + estimate > this.limit;
  }
}

/** Record ACTUAL usage (from the response `usage` object) into the budget,
 *  replacing the pre-flight estimate with the real number. Cached prompt tokens
 *  are reported separately so the caller knows how much prefix caching saved. */
export function recordUsage(usage, model, budget, now = Date.now()) {
  const prompt = usage?.prompt_tokens ?? 0;
  const completion = usage?.completion_tokens ?? 0;
  const cached = usage?.prompt_tokens_details?.cached_tokens ?? usage?.cached_tokens ?? 0;
  const estimate = estimateNeurons(prompt, completion, model);
  const result = budget.spend(estimate, now);
  return { estimate, promptTokens: prompt, completionTokens: completion, cachedTokens: cached, ...result };
}

export default { FREE_NEURONS_PER_DAY, NEURON_RATES, estimateNeurons, utcDayKey, NeuronBudget, recordUsage };