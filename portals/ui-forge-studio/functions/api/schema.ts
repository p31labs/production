/**
 * api/schema.ts — Stage 4 of the brain-dump-to-schema flow [SHIPPED by B3].
 *
 * POST /api/schema — the schema compiler (compyl 4-stage pattern). Accepts a
 * DesignBrief (entities/actions/title), and runs the Dreamer constrained to
 * the ui-schema component tree to EMIT the instance schema (the component
 * tree the renderer draws). Validation is the Shaper's deterministic repair +
 * the ui-schema contract.
 *
 * This is the "schema is derived from the description" step — the brief is the
 * intent, the schema is the derived contract, and the artifact renders from it.
 */
import { forge } from '@p31ca/ui-forge/src/center.mjs';
import uiSchema from '../../src/forge-schema.json';

interface SchemaEnv {
  PHOS_AI_PROXY?: Fetcher;
}

interface SchemaBody {
  /** A DesignBrief (from /api/brief or /api/refine). */
  brief: {
    title?: string;
    goal?: string;
    entities?: Array<{ name: string; fields: Array<{ name: string; type: string }> }>;
    actions?: Array<{ name: string }>;
  };
}

export const onRequestPost: PagesFunction<SchemaEnv> = async ({ request, env }) => {
  let body: SchemaBody;
  try { body = await request.json() as SchemaBody; } catch { return Response.json({ error: 'Invalid JSON body' }, { status: 400 }); }
  if (!body.brief || typeof body.brief.title !== 'string') {
    return Response.json({ error: 'A DesignBrief with a title is required' }, { status: 400 });
  }

  // Build the backend spec from the brief.
  const spec = {
    title: body.brief.title,
    entities: (body.brief.entities ?? []).map((e) => ({ name: e.name, fields: e.fields ?? [] })),
    actions: (body.brief.actions ?? []).map((a) => ({ name: a.name })),
  };

  const providerOpts = {
    endpoint: 'https://phos-ai-proxy/',
    fetchImpl: (url: RequestInfo | URL, init?: RequestInit) => {
      if (env.PHOS_AI_PROXY) return env.PHOS_AI_PROXY.fetch(url, init);
      return fetch(url, init);
    },
    // Constrain the Dreamer to the ui-schema component tree (closed enum).
    schema: uiSchema.schema,
  };

  try {
    const report = await forge(spec, {
      k: 4,
      catalog: uiSchema.catalog,
      providerOpts,
    });
    return Response.json({
      ok: true,
      schema: report.artifact,   // the instance schema (component-tree JSON)
      gate: report.gate,
      survivors: report.survivors,
      kills: report.kills,
    });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
};