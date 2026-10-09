/**
 * session.mjs — the session-affinity manager (Workflow A, prefix-cache wiring).
 *
 * Workers AI prefix caching only works when requests route to the same model
 * instance that holds the cached tensors. The router already sends
 * `x-session-affinity` when `opts.sessionId` is set (router.mjs:278) — this
 * module is the deterministic layer that (a) generates a stable per-run id and
 * (b) asserts the shared prompt prefix is cache-safe before any neurons are
 * spent.
 *
 * The economics (Cloudflare published, 2026): cached input tokens are ~31×
 * cheaper than regular input. e.g. deepseek-v4-flash: $0.014/M cached vs
 * $0.440/M regular; 1,273 vs 40,000 neurons per M. For an agent loop that
 * resends the system prompt + tool definitions on every call, that is an
 * ~85–90% prefill-cost reduction on every call after the first.
 *
 * Constraints this module encodes:
 *   - The first request is always cold (no cached tokens expected).
 *   - A shared prefix under ~1,024 tokens does not qualify for caching — the
 *     warm-up call adds latency for no savings.
 *   - No timestamps in the system prompt: a timestamp in the prefix changes
 *     the prefix on every request, defeating the cache entirely.
 *
 * Pure logic — no model call.
 */
import crypto from 'node:crypto';

/** Stable session id for one research run. Two runs never share an id; every
 *  call within one run uses the same id. Format: `ses_<16 hex>`. */
export function newSessionId() {
  return `ses_${crypto.randomBytes(8).toString('hex')}`;
}

/** Assert the shared prompt prefix is cache-safe. Returns { ok, problems,
 *  approxTokens }. Two failure modes: a timestamp in the prefix, or a prefix
 *  under the ~1,024-token cache block. */
export function assertCacheSafe(systemPrompt, { minTokens = 1024 } = {}) {
  const s = String(systemPrompt ?? '');
  const problems = [];
  if (/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\b|\b(19|20)\d{2}\b[^\n]{0,40}\b\d{1,2}:\d{2}\b/.test(s)) {
    problems.push('system prompt contains a timestamp — move it to the user message');
  }
  const approxTokens = Math.ceil(s.length / 4);
  if (approxTokens < minTokens) {
    problems.push(`shared prefix ~${approxTokens} tokens is under the ${minTokens}-token cache block`);
  }
  return { ok: problems.length === 0, problems, approxTokens };
}

/** Report the cache benefit of a call from the router's return shape
 *  (`{ promptTokens, completionTokens, cachedPromptTokens, modelUsed }`). */
export function cacheReport(result) {
  const prompt = result?.promptTokens ?? 0;
  const completion = result?.completionTokens ?? 0;
  const cached = result?.cachedPromptTokens ?? 0;
  const hitRate = prompt > 0 ? Math.round((cached / prompt) * 100) : 0;
  return {
    model: result?.modelUsed ?? null,
    promptTokens: prompt,
    completionTokens: completion,
    cachedTokens: cached,
    hitRatePct: hitRate,
    cold: cached === 0,
  };
}

export default { newSessionId, assertCacheSafe, cacheReport };