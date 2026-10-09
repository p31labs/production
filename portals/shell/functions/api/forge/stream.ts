/**
 * api/forge/stream — run the REAL ui-forge engine and stream every event
 * through the bus ledger. This is the proof: no simulation — the studio's
 * Grounder/Dreamer/Shaper/Governor pipeline emits into the seam.
 *
 * The engine's `forge(spec, { emit })` emits plain pipeline events; we
 * normalize each to the AG-UI-aligned bus shape and append to the ledger.
 * The client consumes the live stream via /api/bus/stream (SSE).
 */
import { forge } from '@p31ca/ui-forge/src/center.mjs';
import uiSchema from '../../../src/forge-schema.json';
import { append, type Env } from '../../_lib/ledger';
import type { BusEvent } from '../../../src/bus/events';

/** Wrap the Workers AI binding into a forge provider. Inlined here because the
 *  vendored @p31ca/ui-forge package ships no provider-workers-ai-binding.mjs (only
 *  its .d.ts). Returns `(prompt, opts) => Promise<string>` and reports usage. */
function makeBindingProvider(
  env: { AI?: Ai },
  hooks?: { onUsage?: (usage: Record<string, number> | null, model: string) => void },
): (prompt: string, opts?: Record<string, unknown>) => Promise<string> {
  return async (prompt: string, opts?: Record<string, unknown>) => {
    const model = typeof opts?.model === 'string'
      ? opts.model
      : '@cf/mistralai/mistral-small-3.1-24b-instruct';
    const res = (await env.AI!.run(model, { prompt, ...(opts ?? {}) })) as {
      response?: unknown;
      usage?: Record<string, number>;
    };
    if (hooks?.onUsage) hooks.onUsage(res.usage ?? null, model);
    return typeof res.response === 'string'
      ? res.response
      : JSON.stringify(res.response ?? res);
  };
}

interface ForgeBody {
  title?: string;
  entities?: Array<{ name?: string; fields?: Array<{ name: string; type: string }> }>;
  actions?: Array<{ name?: string }>;
  k?: number;
}

const MODEL_MAP: Record<string, (e: Record<string, unknown>) => BusEvent> = {
  'pipeline.stage': (e) => ({ type: 'pipeline.stage', sessionId: String(e.sessionId ?? ''), stage: String(e.stage), status: e.status === 'done' ? 'done' : 'start', extra: e }) as BusEvent,
  'agent.start': (e) => ({ type: 'agent.started', sessionId: String(e.sessionId ?? ''), agent: String(e.agent), label: String(e.label ?? '') }) as BusEvent,
  'agent.think': (e) => ({ type: 'agent.thinking', sessionId: String(e.sessionId ?? ''), agent: String(e.agent), text: String(e.text ?? '') }) as BusEvent,
  'agent.result': (e) => ({ type: 'agent.result', sessionId: String(e.sessionId ?? ''), agent: String(e.agent), summary: String(e.summary ?? ''), detail: typeof e.detail === 'string' ? e.detail : undefined }) as BusEvent,
  'agent.done': (e) => ({ type: 'agent.ended', sessionId: String(e.sessionId ?? ''), agent: String(e.agent), durationMs: typeof e.durationMs === 'number' ? e.durationMs : undefined }) as BusEvent,
  'gate.verdict': (e) => ({ type: 'gate.verdict', sessionId: String(e.sessionId ?? ''), status: e.status as 'pass' | 'incomplete' | 'needs-review' | 'needs-revision', axes: e.axes as Record<string, number> | undefined, source: e.source as 'vision' | 'artifact' | undefined }) as BusEvent,
  'artifact.final': (e) => ({ type: 'artifact.final', sessionId: String(e.sessionId ?? ''), tree: e.tree, tier: e.tier as 'dream' | 'catalog-walk' | 'fallback' | undefined, fellBack: Boolean(e.fellBack) }) as BusEvent,
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: ForgeBody;
  try {
    body = (await request.json()) as ForgeBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const spec = {
    title: body.title ?? 'Untitled surface',
    entities: (body.entities ?? []).map((e) => ({ name: e.name, fields: e.fields ?? [] })),
    actions: (body.actions ?? []).map((a) => ({ name: a.name })),
  };
  const k = typeof body.k === 'number' && Number.isFinite(body.k) ? Math.max(1, Math.floor(body.k)) : 4;

  const sessionId = crypto.randomUUID();

  try {
    // Serialize appends through a single-writer promise chain — the hash
    // chain cannot branch. Without this, the engine's fire-and-forget emit()
    // races parallel async appends that share a prev_hash → broken chain.
    let writeQueue: Promise<unknown> = Promise.resolve();
    const enqueue = (fn: () => Promise<unknown>) => {
      writeQueue = writeQueue.then(fn);
      return writeQueue;
    };

    // Run the real engine. Every emitted event is normalized + appended to the
    // hash-chained ledger (the seam). The client reads it from /api/bus/stream.
    await forge(spec, {
      k,
      catalog: uiSchema.catalog,
      provider: env.AI ? makeBindingProvider(env, {
        // Workers AI returns usage on every call — the numbers the neuron charge
        // is computed from. Emit it so the shell shows a live cost/token meter.
        onUsage: (usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; cached_tokens?: number } | null, model: string) => {
          if (!usage) return;
          enqueue(() => append(env, {
            type: 'model.usage',
            sessionId,
            model,
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
            cached_tokens: usage.cached_tokens ?? 0,
          } as BusEvent, { sessionId, face: 'studio' }));
        },
      }) : undefined,
      providerOpts: { schema: uiSchema.schema },
      emit: (raw: unknown) => {
        const e = raw as Record<string, unknown>;
        const mapper = MODEL_MAP[String(e.type)];
        if (!mapper) return;
        const busEvent = mapper({ ...e, sessionId });
        enqueue(() => append(env, busEvent, { sessionId, face: 'studio' }));
      },
    });
    await writeQueue; // flush any remaining queued appends

    return Response.json({ ok: true, sessionId, note: 'events appended to the bus ledger' });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'forge failure', sessionId }, { status: 500 });
  }
};