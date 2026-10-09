/**
 * provider-workers-ai-binding.mjs — the Dreamer provider backed by the
 * Workers AI *binding* (env.AI.run), for the Pages Functions runtime.
 *
 * The deployed shell's forge/stream Function cannot fetch the local router
 * (a Node CLI) and must not fetch the dead phos-ai-proxy. This provider calls
 * env.AI.run directly — no external fetch, no proxy, no service binding.
 *
 * Contract (same as every Dreamer provider): (prompt, opts) → Promise<string>
 * where the string is a JSON array of candidate component trees.
 *
 * JSON Mode: the Dreamer needs structured output. When opts.schema is present,
 * we send response_format (array of p31Component). JSON Mode cannot stream —
 * irrelevant here, because the engine emits its own agent.* SSE events around
 * the call. If JSON Mode fails (schema too complex / model unsupported), we
 * retry unconstrained; the Shaper + extractJsonArray recover downstream.
 *
 * Model: non-reasoning by default (JSON generation needs no chain-of-thought,
 * and reasoning models burn the shared free-tier neuron budget). Override via
 * opts.model. The router (PART5) remains the source of truth for selection;
 * this is the deployed fallback, not the selector.
 */

function normalize(res) {
  if (typeof res === 'string') return res;
  if (res && typeof res === 'object') {
    if (typeof res.response === 'string') return res.response;
    if (res.response != null) return JSON.stringify(res.response);
    return JSON.stringify(res);
  }
  throw new Error('empty dreamer response');
}

export function makeBindingProvider(env, { onUsage } = {}) {
  return async function bindingProvider(prompt, opts = {}) {
    const model = opts.model ?? '@cf/mistralai/mistral-small-3.1-24b-instruct';
    const inputs = {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts.maxTokens ?? 4096,
      temperature: opts.temperature ?? 0.9,
    };
    if (opts.schema) {
      inputs.response_format = {
        type: 'json_schema',
        json_schema: {
          type: 'array',
          items: { $ref: '#/$defs/p31Component' },
          $defs: opts.schema.$defs ?? {},
        },
      };
    }

    let res;
    try {
      res = await env.AI.run(model, inputs);
    } catch {
      // JSON Mode failed (schema too complex / unsupported) → unconstrained.
      delete inputs.response_format;
      res = await env.AI.run(model, inputs);
    }

    // Workers AI returns usage on every call (prompt_tokens, completion_tokens,
    // total_tokens, cached_tokens) — the numbers the neuron charge is computed
    // from. Surface it; the shell's forge/stream emits it as a model.usage event.
    if (typeof onUsage === 'function') {
      try { onUsage(res?.usage ?? null, model); } catch { /* usage is best-effort */ }
    }
    return normalize(res);
  };
}

export default makeBindingProvider;