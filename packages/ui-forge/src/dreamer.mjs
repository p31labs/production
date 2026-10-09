/**
 * dreamer.mjs — the second tetrahedral vertex.
 *
 * DREAMER: reach — surface what's latent. Generates K candidate component
 * trees from the Grounder's verified context. Resists converging, censoring,
 * and self-verifying: it reasons freely ("reason free, constrain late" — the
 * Shaper enforces the schema afterward).
 *
 * The Dreamer does NOT emit code, HTML, or arbitrary JSON — it emits a
 * component-tree spec shaped by the ui-schema vocabulary (the catalog the
 * Dreamer reads). The Shaper then validates + repairs. A candidate that
 * references an unknown component is dropped, not rendered.
 *
 * `generate` is a provider function:
 *   generate({ prompt, schema, catalog }) → Promise<string>  (model text)
 * The default provider POSTs to the phos-ai-proxy chat endpoint (the same
 * Workers AI stack, role-prompted). Tests inject a stub.
 */

const ENDPOINT = process.env.P31_FORGE_ENDPOINT || 'https://phos-ai-proxy.trimtab-signal.workers.dev/';
const DREAMER_MODEL = process.env.P31_DREAMER_MODEL || '@cf/meta/llama-3.1-8b-instruct-fast';

import { retryFetch } from './retry.mjs';

function buildDreamerPrompt(grounded, catalog, k) {
  const names = catalog.components.map((c) => c.name).join(', ');
  // Per-component allowed tokens (namespaced) — the Dreamer must reference
  // ONLY tokens a component's contract permits. This is the THAKI gate's
  // vocabulary half: validity is enforced by the Shaper, but a Dreamer that
  // emits `p31.color.action.primary` on a Topbar produces an inadmissible
  // candidate. Tell it the contract up front.
  const tokenMap = catalog.components
    .map((c) => `  ${c.name}: ${(c.tokens ?? []).map((t) => (t.startsWith('p31.') ? t : `p31.${t}`)).join(', ')}`)
    .join('\n');
  const entities = (grounded.entities ?? []).map((e) => `- ${e.name ?? e.id} (${(e.fields ?? []).map((f) => f.name).join(', ')})`).join('\n');
  const actions = (grounded.actions ?? []).map((a) => `- ${a.name ?? (typeof a === 'string' ? a : '?')}`).join('\n');
  return [
    'You are the DREAMER of the P31 tetrahedral UI engine. Generate the UI structure the operator needs.',
    '',
    'Available component types (closed vocabulary — use ONLY these):',
    names,
    '',
    'Per-component ALLOWED tokens (namespaced) — reference only these for a component:',
    tokenMap,
    '',
    'Verified backend context:',
    `Entities:\n${entities || '(none)'}`,
    `Actions:\n${actions || '(none)'}`,
    '',
    `Emit EXACTLY ${k} DISTINCT candidate component-tree specs, each as a JSON object like:`,
    '  { "id": "root", "type": "Topbar", "props": { ... }, "tokens": ["p31.<allowed token>"], "children": [ ... ], "dataBinding": "entity.field" }',
    '',
    'Rules:',
    '- Top-level type MUST be from the closed list (Topbar/SidebarNav/Card/GlassPanel/etc).',
    '- Bind data with dataBinding refs to the verified entities/actions — EVERY candidate must bind to at least one entity or action.',
    '- tokens MUST be from that component\'s allowed list (p31.* namespaced).',
    '- Make the ${k} candidates deliberately DIFFERENT (different layouts, different primary surfaces).',
    '- Respond with a JSON array of ${k} objects and nothing else.',
  ].join('\n');
}

/** The default provider — same Workers AI stack, role-prompted. Uses the
 *  shared classified retryFetch: retries only 429/5xx/network with backoff,
 *  fails fast on deterministic 4xx / Workers AI 7502/7504/7506.
 *
 *  `endpoint` and `fetchImpl` are injectable so a Cloudflare Pages Function
 *  can route through a service binding (env.PHOS_AI_PROXY) instead of a
 *  public URL — worker→worker public-URL fetch fails with error 1042. The
 *  CLI keeps the defaults.
 *
 *  `schema` (optional) enables Workers AI JSON Mode: the request sends
 *  `response_format: { type: 'json_schema', json_schema: schema }`, which
 *  constrains the output to the ui-schema component tree (THAKI "reason free,
 *  constrain late" applied at generation time). JSON Mode can't guarantee
 *  conformance, so on any failure (JSON Mode error or non-JSON output) we
 *  FALL BACK to the current unconstrained call — the Shaper stays the
 *  deterministic repair layer. */
export async function defaultProvider(prompt, { model = DREAMER_MODEL, endpoint = ENDPOINT, fetchImpl = retryFetch, schema } = {}) {
  const body = { messages: [{ role: 'user', content: prompt }], model, max_tokens: 4096, temperature: 0.9 };

  // Attempt 1: JSON Mode with the ui-schema (when provided). The Dreamer emits
  // an ARRAY of K candidate trees, so the response schema is the ui-schema's
  // p31Component definition wrapped in an array (with $defs preserved).
  if (schema) {
    try {
      const jsonSchema = {
        type: 'array',
        items: { $ref: '#/$defs/p31Component' },
        $defs: schema.$defs ?? {},
      };
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, response_format: { type: 'json_schema', json_schema: jsonSchema } }),
      }, { timeoutMs: 120000 });
      const text = await normalizeResponse(res);
      if (text) {
        // Accept ONLY a non-empty JSON array. Workers AI JSON Mode can return
        // `[]` (HTTP 200) when the schema is too complex (33 $defs) — an empty
        // array is a valid JSON response that is NOT a valid result. Any other
        // shape (single object, prose, empty) → fall through.
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed) && parsed.length > 0) return text;
        } catch { /* not JSON → fall through */ }
      }
    } catch {
      // JSON Mode failed (model/schema too complex) → fall through.
    }
  }

  // Attempt 2: unconstrained (current behavior) — the Shaper enforces validity.
  const res = await fetchImpl(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, { timeoutMs: 120000 });
  const text = await normalizeResponse(res);
  if (!text) throw new Error('empty dreamer response');
  return text;
}

/** Normalize a Workers AI chat response to a string. `result.response` may be
 *  a string OR a pre-parsed JSON object (documented SK-LLM-036 behavior for
 *  JSON-emitting models). An object must be JSON.stringify'd, else
 *  `String(object)` produces `[object Object]` → a silent-zero candidate path.
 *  Returns null when the body is missing or unusable. */
async function normalizeResponse(res) {
  const data = await res.json();
  const response = data?.result?.response;
  if (response == null) return null;
  if (typeof response === 'string') return response;
  try { return JSON.stringify(response); } catch { return null; }
}

function extractJsonArray(text) {
  const t = String(text).trim();
  // Try direct JSON parse (array OR single object → wrap).
  try {
    const parsed = JSON.parse(t);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === 'object') return [parsed];
  } catch { /* fall through */ }
  // Extract the first [...] block.
  const m = t.match(/\[[\s\S]*\]/);
  if (m) {
    try {
      const arr = JSON.parse(m[0]);
      if (Array.isArray(arr)) return arr;
    } catch { /* not parseable */ }
  }
  return [];
}

/** Dreamer entry: build the prompt, call the provider, parse K candidates.
 *  Returns an array of raw candidate trees (possibly fewer than K — the
 *  Shaper/Governor handle a thin crop gracefully). */
export async function dream(grounded, catalog, { k = 4, provider = defaultProvider, providerOpts = {} } = {}) {
  const prompt = buildDreamerPrompt(grounded, catalog, k);
  const text = await provider(prompt, providerOpts);
  const candidates = extractJsonArray(text).filter((c) => c && typeof c === 'object');
  return { candidates, prompt, raw: text };
}