/**
 * api/refine.ts — Stage 3 of the brain-dump-to-schema flow [SHIPPED by B2].
 *
 * POST /api/refine — the refinement turn. The agent receives the CURRENT
 * DesignBrief (the shared state, serialized into the system prompt per the
 * CrewAI shared-state pattern) plus a human instruction, and returns an
 * EDITED brief. The studio writes the returned brief back into the shared
 * store — so edits on either side (agent turn OR human edit) flow to the
 * other on the next turn.
 */
import uiSchema from '../../src/forge-schema.json';

interface RefineEnv {
  PHOS_AI_PROXY?: Fetcher;
}

interface RefineBody {
  /** The current DesignBrief (source-of-truth state). */
  brief: {
    title: string;
    goal: string;
    structure: string[];
    constraints: string[];
    entities: Array<{ name: string; fields: Array<{ name: string; type: string }> }>;
    actions: Array<{ name: string }>;
  };
  /** The human's instruction (e.g. "add a mobile collapsed state"). */
  instruction?: string;
}

const providerFetch = (env: RefineEnv, url: RequestInfo | URL, init?: RequestInit) => {
  if (env.PHOS_AI_PROXY) return env.PHOS_AI_PROXY.fetch(url, init);
  return fetch(url, init);
};

const REFINE_PROMPT = (briefJson: string, instruction: string) => `You are the REFINER of the P31 UI forge. The operator has given a refinement instruction. Apply it to the current DesignBrief and return the FULL updated brief.

Available component types (closed vocabulary — reference only these): ${uiSchema.catalog.components.map((c) => c.name).join(', ')}.

Rules:
- Preserve every existing entity/action unless the instruction changes them.
- Do not invent entities/actions the instruction doesn't imply.
- Keep it minimal. Return ONLY the JSON object, no prose.

CURRENT BRIEF (JSON):
${briefJson}

OPERATOR INSTRUCTION:
"""${instruction.slice(0, 1000)}"""

Return STRICT JSON matching the current brief's shape: { "title": "...", "goal": "...", "structure": [...], "constraints": [...], "entities": [{"name": "...", "fields": [{"name": "...", "type": "..."}]}], "actions": [{"name": "..."}] }.`;

export const onRequestPost: PagesFunction<RefineEnv> = async ({ request, env }) => {
  let body: RefineBody;
  try { body = await request.json() as RefineBody; } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  const instruction = body.instruction?.trim();
  if (!instruction) return Response.json({ error: 'A refinement instruction is required' }, { status: 400 });
  if (!body.brief || typeof body.brief.title !== 'string') return Response.json({ error: 'A current brief is required' }, { status: 400 });

  try {
    const res = await providerFetch(env, 'https://phos-ai-proxy/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: REFINE_PROMPT(JSON.stringify(body.brief), instruction) }],
        model: '@cf/meta/llama-3.1-8b-instruct-fast',
        max_tokens: 1500,
        temperature: 0.2,
      }),
    });
    const data = (await res.json()) as { result?: { response?: string | Record<string, unknown> } };
    const response = data?.result?.response ?? String(data);
    const parsed = typeof response === 'string' ? parseBrief(response) : response;
    if (!parsed || typeof parsed.title !== 'string') throw new Error('refinement returned no usable brief');

    const brief = {
      title: parsed.title,
      goal: parsed.goal ?? body.brief.goal,
      structure: Array.isArray(parsed.structure) ? parsed.structure : body.brief.structure,
      constraints: Array.isArray(parsed.constraints) ? parsed.constraints : body.brief.constraints,
      entities: Array.isArray(parsed.entities) ? parsed.entities : body.brief.entities,
      actions: Array.isArray(parsed.actions) ? parsed.actions : body.brief.actions,
    };

    return Response.json({ ok: true, brief });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
};

function parseBrief(text: string): Record<string, unknown> | null {
  const t = String(text).trim();
  try { const p = JSON.parse(t); return p && typeof p === 'object' ? p : null; } catch { /* fall through */ }
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
  return null;
}