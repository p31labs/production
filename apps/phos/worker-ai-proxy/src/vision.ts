/**
 * vision.ts — PHOS AI Proxy vision module (design-team specialty agent).
 *
 * POST /vision — Workers AI vision review of a UI screenshot.
 *
 * Body:
 *   { image: <base64 | data-url>, model?: string, prompt?: string,
 *     mode?: 'critique' | 'detect', target?: string, rubric?: string, median?: number }
 *
 * Modes:
 *   critique (default) — Llama 3.2 11B Vision → anti-slop rubric verdict
 *     (layout_novelty / visual_identity_distinctiveness / component_pattern_novelty
 *      each 0-10 + evidence + critique). Median-of-N (default 3) + content-hash
 *     cache, ported from tools (1)/design-parity/slop-judge.mjs.
 *   detect — Moondream 3.1 point/detect → bounding boxes for a target phrase
 *     (e.g. "user avatar", "composer input"). Fast, geometric — no judgment.
 *
 * Zero-retention: no persistence of the image beyond the request; the
 * content-hash cache is advisory only (identical image → identical score).
 */

export interface VisionEnv {
  AI: any;
  ALLOWED_ORIGINS?: string[];
}

function corsHeaders(origin: string, allowed: string[]): Record<string, string> {
  const cors = allowed.includes(origin) ? origin : '';
  return {
    'Access-Control-Allow-Origin': cors,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

function respond(data: unknown, status: number, origin: string, allowed: string[]): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, allowed) },
  });
}

/** Same as respond but sets X-P31-Degraded: true — mirroring Cloudflare AI
 *  Gateway's cf-aig-step observability so callers/CI can see a fallback or
 *  neutral-failure path was taken. */
function respondDegraded(data: unknown, status: number, origin: string, allowed: string[]): Response {
  const headers = { 'Content-Type': 'application/json', 'X-P31-Degraded': 'true', ...corsHeaders(origin, allowed) };
  return new Response(JSON.stringify(data), { status, headers });
}

export interface VisionModelDef {
  id: string;
  label: string;
  quality: 'standard' | 'high' | 'premium';
  costPer1M?: { input: number; output: number };
  latency?: string;
  context?: number;
}

/**
 * Model picker catalog — the vision design team's routable models.
 * `body.model` (critique or detect) resolves through this map; unknown keys
 * fall back to the mode default. The catalog is also served at GET /models.
 */
export const VISION_MODELS: {
  critique: { [key: string]: VisionModelDef | string; default: string };
  detect: { [key: string]: VisionModelDef | string; default: string };
} = {
  critique: {
    // Gemma 4 26B A4B — Cloudflare's current vision recommendation; MoE 26B/4B
    // active, 256K context, explicit "screen and UI understanding". Default.
    'gemma-4-26b': {
      id: '@cf/google/gemma-4-26b-a4b-it',
      label: 'Gemma 4 26B A4B',
      quality: 'high',
      costPer1M: { input: 0.10, output: 0.30 },
      context: 256_000,
    },
    // Llama 3.2 11B Vision — battle-tested in slop-judge; cheap fallback.
    'llama-3.2-11b': {
      id: '@cf/meta/llama-3.2-11b-vision-instruct',
      label: 'Llama 3.2 11B Vision',
      quality: 'standard',
      costPer1M: { input: 0.049, output: 0.676 },
      context: 128_000,
    },
    // Qwen 3.8 27B — premium reasoning-heavy review (4.5x input / 10x output
    // cost vs Gemma 4). Use for deep critique, not routine layout checks.
    'qwen-3-27b': {
      id: '@cf/qwen/qwen3.8-27b',
      label: 'Qwen 3.8 27B',
      quality: 'premium',
      costPer1M: { input: 0.45, output: 3.20 },
      context: 262_144,
    },
    // Default is llama-3.2-11b (not gemma-4-26b): gemma-a4b does not accept
    // the OpenAI-style image_url message shape on this account and fails with
    // 502, while llama-3.2-11b-vision-instruct is battle-tested in
    // slop-judge. Gemma stays in the catalog for explicit opt-in.
    default: 'llama-3.2-11b',
  },
  detect: {
    // Moondream 3.1 — ~160ms detect / ~145ms point, 2B active params; the
    // geometry / element-location champion. Default for detect mode.
    'moondream-3.1': {
      id: '@cf/moondream/moondream3.1-9B-A2B',
      label: 'Moondream 3.1',
      quality: 'high',
      latency: 'detect ~160ms · point ~145ms',
      context: 32_000,
    },
    default: 'moondream-3.1',
  },
};

export function resolveCritiqueModel(key?: string): { def: VisionModelDef; key: string } {
  const k = key && typeof VISION_MODELS.critique[key] === 'object' ? key : VISION_MODELS.critique.default;
  return { def: VISION_MODELS.critique[k] as VisionModelDef, key: k };
}

export function resolveDetectModel(key?: string): { def: VisionModelDef; key: string } {
  const k = key && typeof VISION_MODELS.detect[key] === 'object' ? key : VISION_MODELS.detect.default;
  return { def: VISION_MODELS.detect[k] as VisionModelDef, key: k };
}

export const DEFAULT_RUBRIC = `You are a strict UI quality judge. You score a UI screenshot against three rubric dimensions.

RUBRIC:
- layout_novelty: Layout novelty (0-10) — Is the page layout distinctive, or a cookie-cutter centered-column + gradient-hero + card-grid template? Reward intentional asymmetry, editorial structure, real hierarchy.
- visual_identity_distinctiveness: Visual-identity distinctiveness (0-10) — Does the design carry a recognizable identity — a point of view in color, type, texture? Penalize un-themed templates.
- component_pattern_novelty: Component-pattern novelty (0-10) — Are the components bespoke to this system, or stock AI boilerplate? Penalize glassmorphism-everywhere, gradient pills, emoji-as-icon.

You are NOT here to be encouraging. You are here to find every flaw, every shortcut, every sign of mediocrity. A passing score must mean the UI is genuinely good — not "good for an AI."

Rules:
- Score each dimension 0-10 with MANDATORY cited evidence from the screenshot (specific: colors, type, spacing, components visible).
- Do NOT say "overall good effort" or "solid foundation" — these are cope.
- Do NOT give points for effort.
- Penalize heavily for AI-slop aesthetics: default gradient palettes, glassmorphism excess, centered-column boilerplate, emoji icons, generic card grids.
- Respond with STRICT JSON only:
{"layout_novelty": 0-10, "visual_identity_distinctiveness": 0-10, "component_pattern_novelty": 0-10, "evidence": {"layout_novelty": "...", "visual_identity_distinctiveness": "...", "component_pattern_novelty": "..."}, "verdict": "pass"|"fail", "critique": "2-3 sentences"}`;

function extractBalancedJson(text: string): Record<string, unknown> | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { const cand = text.slice(start, i + 1); try { return JSON.parse(cand); } catch { return null; } } }
  }
  return null;
}

async function hashContent(b64: string): Promise<string> {
  // SHA-256 of the base64 image — cache key, not a security boundary.
  const bytes = new TextEncoder().encode(b64);
  const buf = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

function asDataUrl(image: string): string {
  if (image.startsWith('data:')) return image;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return `data:image/png;base64,${image}`;
}

async function runVision(env: VisionEnv, model: string, system: string, userText: string, dataUrl: string): Promise<string> {
  const res = await env.AI.run(model, {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: [{ type: 'image_url', image_url: { url: dataUrl } }, { type: 'text', text: userText }] },
    ],
  });
  const out = res?.response ?? res ?? JSON.stringify(res);
  return typeof out === 'string' ? out : JSON.stringify(out);
}

async function critiqueOnce(env: VisionEnv, modelId: string, dataUrl: string, rubric: string, userText: string): Promise<Record<string, unknown> | null> {
  const text = await runVision(env, modelId, rubric, userText, dataUrl);
  let parsed: Record<string, unknown> | null = null;
  try { parsed = JSON.parse(text); } catch { parsed = extractBalancedJson(text); }
  if (!parsed) {
    const g = (k: string) => { const m = text.match(new RegExp(`${k}["'\\s:]+(\\d+(?:\\.\\d+)?)`)); return m ? Number(m[1]) : undefined; };
    const l = g('layout_novelty'), v = g('visual_identity_distinctiveness'), c = g('component_pattern_novelty');
    if (l !== undefined && v !== undefined && c !== undefined) {
      parsed = { layout_novelty: l, visual_identity_distinctiveness: v, component_pattern_novelty: c, verdict: 'fail', critique: 'parsed from prose fallback' };
    }
  }
  const req = ['layout_novelty', 'visual_identity_distinctiveness', 'component_pattern_novelty'];
  if (parsed && req.every((k) => typeof parsed[k] === 'number')) {
    const total = (Number(parsed.layout_novelty) + Number(parsed.visual_identity_distinctiveness) + Number(parsed.component_pattern_novelty)) / 3;
    return { ...parsed, mean: Number(total.toFixed(2)) };
  }
  return null;
}

export async function handleVision(req: Request, env: VisionEnv): Promise<Response> {
  const allowed = env.ALLOWED_ORIGINS || [];
  const origin = req.headers.get('Origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin, allowed) });
  }

  let body: any;
  try { body = await req.json(); } catch { return respond({ error: 'Invalid JSON' }, 400, origin, allowed); }
  if (!body?.image) return respond({ error: 'Missing image' }, 400, origin, allowed);

  const dataUrl = asDataUrl(String(body.image));
  const mode = body.mode === 'detect' ? 'detect' : 'critique';
  const { def: critiqueDef, key: critiqueKey } = resolveCritiqueModel(String(body.model ?? ''));
  const rubric = String(body.rubric || DEFAULT_RUBRIC);
  const userText = String(body.prompt || 'Score this UI screenshot against the rubric. Be ruthlessly strict. Respond with STRICT JSON only.');
  // Cache key = image hash + review identity (rubric + model). A default-
  // rubric request and a custom-rubric request for the SAME image must NOT
  // collide — the scores are rubric-dependent. Without the rubric in the key
  // the cache served one review's result to the other (measured: stale 0s).
  const noCache = body.noCache === true || body.noCache === 'true';
  const cacheKey = mode === 'detect'
    ? undefined
    : await hashContent(dataUrl + '|' + rubric + '|' + critiqueDef.id).catch(() => undefined);
  const cache = (globalThis as any).__visionCache || ((globalThis as any).__visionCache = new Map<string, Record<string, unknown>>());

  if (mode === 'detect') {
    const target = String(body.target || 'object');
    const { def: detectDef, key: detectKey } = resolveDetectModel(String(body.model ?? ''));
    const userText = `Describe the location of "${target}" in this screenshot. Respond with the point coordinates or bounding box where it appears, or say "not found".`;
    const text = await runVision(env, detectDef.id, 'You are a visual locator. Identify where the requested object appears in the screenshot. Be precise and concise.', userText, dataUrl);
    return respond({ mode: 'detect', target, model: detectDef.id, modelKey: detectKey, modelLabel: detectDef.label, result: text }, 200, origin, allowed);
  }

  if (!noCache && cacheKey && cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    return respond({ ...cached, cached: true, mode: 'critique', model: critiqueDef.id, modelKey: critiqueKey, modelLabel: critiqueDef.label }, 200, origin, allowed);
  }

  const n = Math.max(1, Number(body.median ?? 3));
  const attempts: Record<string, unknown>[] = [];
  let degraded = false;
  let failureReason = '';

  // ── Critique model chain ────────────────────────────────────────────────
  // Requested model first, then the rest of the catalog, so a single platform
  // outage on the primary (llama-3.2-11b-vision has a documented incident
  // history) falls back to another vision model — mirrors Cloudflare AI
  // Gateway fallback chains (cf-aig-step 0/1/2). When a custom rubric is
  // present and its attempt fails, the SAME model retries with DEFAULT_RUBRIC
  // (proven reliable) before moving on.
  const chainKeys = [
    critiqueKey,
    ...Object.keys(VISION_MODELS.critique).filter((k) => k !== 'default' && k !== critiqueKey),
  ];
  const DEFAULT_USER = 'Score this UI screenshot against the rubric. Be ruthlessly strict. Respond with STRICT JSON only.';
  const RETRYABLE_HTTP = new Set([429, 500, 502, 503, 504]);

  /** Error classification: 429/5xx/network → retryable; Workers AI
   *  deterministic codes (7502 model-not-found, 7504 input-validation,
   *  7506 context-limit) and other 4xx → fail fast (retry is meaningless). */
  const isRetryable = (e: unknown): boolean => {
    const err = e as { code?: number; status?: number; message?: string };
    if (typeof err?.code === 'number' && [7502, 7504, 7506].includes(err.code)) return false;
    if (typeof err?.status === 'number') return RETRYABLE_HTTP.has(err.status) || err.status >= 500;
    return true; // network / unknown → retryable
  };

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  /** One model+rubric attempt with bounded retry (1s, 2s backoff) on
   *  retryable errors only. Returns a scored record or null. */
  const attemptModel = async (modelId: string, rb: string, user: string): Promise<Record<string, unknown> | null> => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await critiqueOnce(env, modelId, dataUrl, rb, user);
        if (r) return r;
        return null; // model responded but output unparseable — not retryable
      } catch (e) {
        failureReason = e instanceof Error ? e.message : String(e);
        if (!isRetryable(e)) return null; // deterministic error — no retry
        if (attempt < 2) await sleep(1000 * Math.pow(2, attempt));
      }
    }
    return null;
  };

  const attemptOnce = async (): Promise<Record<string, unknown> | null> => {
    for (const key of chainKeys) {
      const def = VISION_MODELS.critique[key] as VisionModelDef;
      const useCustom = rubric !== DEFAULT_RUBRIC;
      let r: Record<string, unknown> | null = null;
      if (useCustom) {
        r = await attemptModel(def.id, rubric, userText);
        if (!r) degraded = true; // custom rubric failed → degraded to default
      }
      if (!r) {
        r = await attemptModel(def.id, DEFAULT_RUBRIC, DEFAULT_USER);
        if (r && useCustom) degraded = true;
      }
      if (r) {
        if (key !== critiqueKey) degraded = true; // fell back to another model
        return r;
      }
    }
    return null;
  };

  for (let i = 0; i < n; i++) {
    const r = await attemptOnce();
    if (r) attempts.push(r);
  }

  // Neutral-failure response: the gate must distinguish "platform down"
  // (unmeasured) from "measured and collapsed". A 502 would collapse the
  // axis; a neutral mean:5 + verdict:'unmeasured' + degraded:true lets the
  // gate report needs-review instead.
  if (attempts.length === 0) {
    return respondDegraded(
      { error: 'all vision models failed', reason: failureReason, mean: 5, verdict: 'unmeasured', degraded: true, mode: 'critique' },
      200, origin, allowed,
    );
  }

  const byMean = attempts.slice().sort((a, b) => (a.mean as number) - (b.mean as number));
  const result = byMean[Math.floor(byMean.length / 2)];
  result.runs = attempts.map((a) => a.mean);
  result.cached = false;
  result.mode = 'critique';
  result.model = critiqueDef.id;
  result.modelKey = critiqueKey;
  result.modelLabel = critiqueDef.label;
  result.degraded = degraded || undefined;

  // Validate before cache write — model output is external data, not a trust
  // boundary. A flaky mean:0 or a missing verdict must NOT be cached and
  // served forever.
  const cacheable = typeof result.mean === 'number' && result.mean >= 0 && result.mean <= 10
    && typeof result.verdict === 'string' && result.verdict.length > 0;
  if (cacheKey && !noCache && cacheable) cache.set(cacheKey, result);
  return degraded ? respondDegraded(result, 200, origin, allowed) : respond(result, 200, origin, allowed);
}

/** GET /models — the vision design team's routable model catalog. */
export function handleModels(req: Request, env: VisionEnv): Response {
  const allowed = env.ALLOWED_ORIGINS || [];
  const origin = req.headers.get('Origin') || '';
  const catalog = {
    critique: {
      default: VISION_MODELS.critique.default,
      options: Object.entries(VISION_MODELS.critique)
        .filter(([k]) => k !== 'default')
        .map(([k, v]) => ({ key: k, ...(v as VisionModelDef) })),
    },
    detect: {
      default: VISION_MODELS.detect.default,
      options: Object.entries(VISION_MODELS.detect)
        .filter(([k]) => k !== 'default')
        .map(([k, v]) => ({ key: k, ...(v as VisionModelDef) })),
    },
  };
  return respond(catalog, 200, origin, allowed);
}