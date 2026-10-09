/**
 * retry.mjs — bounded, classified HTTP retry for the tetrahedral engine.
 *
 * The research is explicit (LabEx "Handle Cloudflare Workers AI Failures";
 * GitCode "Workers AI 实战模式"): retry only recoverable errors, fail fast on
 * deterministic ones, and never loop until you burn the Neurons budget.
 *
 * Classification:
 *   - RETRYABLE: 429 (rate limit) + 5xx (server) + network/unknown
 *   - DETERMINISTIC (no retry): 4xx client errors + Workers AI internal
 *     codes 7502 (model not found), 7504 (input validation failed),
 *     7506 (context limit exceeded). Retrying these is meaningless.
 *
 * Backoff: 2^attempt * baseMs (1s, 2s, 4s). Bounded by maxAttempts (default 3).
 * Jitter: ±20% to avoid synchronized retry storms.
 */

export const RETRYABLE_HTTP = new Set([429, 500, 502, 503, 504]);
export const DETERMINISTIC_CODES = new Set([7502, 7504, 7506]);

export function isRetryableError(e) {
  const err = e ?? {};
  if (typeof err.code === 'number' && DETERMINISTIC_CODES.has(err.code)) return false;
  if (typeof err.status === 'number') {
    if (RETRYABLE_HTTP.has(err.status) || err.status >= 500) return true;
    if (err.status >= 400 && err.status < 500) return false; // deterministic 4xx
  }
  return true; // network / unknown → retryable
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Fetch with bounded, classified retry.
 * @param {string|URL|Request} url
 * @param {object} [options]        fetch options
 * @param {object} [retry]
 * @param {number} [retry.maxAttempts=3]
 * @param {number} [retry.baseMs=1000]
 * @param {number} [retry.timeoutMs=120000]
 * @returns {Promise<Response>} the first successful response; throws after
 *   maxAttempts on a retryable failure, or immediately on a deterministic one.
 */
export async function retryFetch(url, options = {}, retry = {}) {
  const maxAttempts = retry.maxAttempts ?? 3;
  const baseMs = retry.baseMs ?? 1000;
  const timeoutMs = retry.timeoutMs ?? 120000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, { ...options, signal: options.signal ?? controller.signal });
    } catch (e) {
      clearTimeout(timer);
      if (!isRetryableError(e)) throw e;
      if (attempt < maxAttempts - 1) {
        const jitter = 1 + (Math.random() - 0.5) * 0.4;
        await delay(baseMs * Math.pow(2, attempt) * jitter);
        continue;
      }
      throw e;
    }
    clearTimeout(timer);

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      // Peek at a JSON error body for the internal code (7502/7504/7506).
      try {
        const ct = res.headers.get('content-type') ?? '';
        if (ct.includes('application/json')) {
          const body = await res.clone().json();
          if (typeof body?.code === 'number') err.code = body.code;
        }
      } catch { /* non-JSON body */ }
      if (!isRetryableError(err)) throw err;
      if (attempt < maxAttempts - 1) {
        const jitter = 1 + (Math.random() - 0.5) * 0.4;
        await delay(baseMs * Math.pow(2, attempt) * jitter);
        continue;
      }
      throw err;
    }
    return res;
  }
  throw new Error('retryFetch exhausted attempts');
}