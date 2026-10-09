/**
 * api/brief.ts — Stage 1+2 of the brain-dump-to-schema flow [SHIPPED by B1].
 *
 * POST /api/brief — takes natural-language design intent, runs a two-stage
 * pipeline: (A) extract entities/actions/layout intent via the Dreamer
 * provider, (B) emit a JSON DesignBrief (Goal/Structure/Constraints/Reference
 * + entities + actions). The brief is the exportable, human-owned intent
 * layer — the schema is derived from it later.
 *
 * Returns the JSON brief. The studio renders it to markdown for export.
 */
import uiSchema from '../../src/forge-schema.json';

interface BriefEnv {
  PHOS_AI_PROXY?: Fetcher;
}

interface BriefBody {
  /** The natural-language design idea. */
  text?: string;
}

const providerFetch = (env: BriefEnv, url: RequestInfo | URL, init?: RequestInit) => {
  if (env.PHOS_AI_PROXY) return env.PHOS_AI_PROXY.fetch(url, init);
  return fetch(url, init);
};

const EXTRACT_PROMPT = (text: string) => `You are the INTENT EXTRACTOR of the P31 UI forge. From the following natural-language design idea, extract the structured intent.

Available component types (closed vocabulary — reference only these): ${uiSchema.catalog.components.map((c) => c.name).join(', ')}.

Return STRICT JSON:
{
  "title": "<short surface title>",
  "goal": "<one sentence: what the user is trying to accomplish>",
  "structure": ["<page or section, one per line>"],
  "constraints": ["<accessibility / sensory / brand constraint>"],
  "entities": [{"name": "<entity>", "fields": [{"name": "<field>", "type": "<string|number|boolean|enum>"}]}],
  "actions": [{"name": "<action>"}]
}

Rules:
- Extract at least one entity or action; do not invent fields the idea doesn't imply.
- Keep it minimal — the user refines later.
- Return ONLY the JSON object, no prose.

Design idea:
"""${text.slice(0, 4000)}"""`;

export const onRequestPost: PagesFunction<BriefEnv> = async ({ request, env }) => {
  let body: BriefBody;
  try { body = await request.json() as BriefBody; } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const text = body.text?.trim();
  if (!text || text.length < 5) return Response.json({ error: 'A natural-language design idea (text) is required' }, { status: 400 });

  try {
    const res = await providerFetch(env, 'https://phos-ai-proxy/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: EXTRACT_PROMPT(text) }],
        model: '@cf/meta/llama-3.1-8b-instruct-fast',
        max_tokens: 1500,
        temperature: 0.3,
        response_format: { type: 'json_schema', json_schema: { type: 'object', additionalProperties: true } },
      }),
    });
    const data = (await res.json()) as { result?: { response?: string | Record<string, unknown> } };
    const response = data?.result?.response ?? String(data);
    const parsed = typeof response === 'string' ? parseBrief(response) : response;
    if (!parsed || typeof parsed.title !== 'string') throw new Error('brief extraction returned no usable title');

    // Normalize into the canonical DesignBrief shape.
    const brief = {
      title: parsed.title,
      goal: parsed.goal ?? 'To be refined',
      structure: Array.isArray(parsed.structure) ? parsed.structure : [],
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints : [],
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
    };

    return Response.json({ ok: true, brief });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
};

/** Extract a JSON object from the model response (string or pre-parsed). */
function parseBrief(text: string): Record<string, unknown> | null {
  const t = String(text).trim();
  try { const p = JSON.parse(t); return p && typeof p === 'object' ? p : null; } catch { /* fall through */ }
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
  return null;
}