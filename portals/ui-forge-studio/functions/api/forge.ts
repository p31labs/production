/**
 * api/forge.ts — the live studio's forge endpoint.
 *
 * POST /api/forge — runs the full generation tetrahedron server-side:
 * Grounder → Dreamer → Governor → Shaper → SIC-POVM gate → Center.
 *
 * The Dreamer routes to phos-ai-proxy through the PHOS_AI_PROXY service
 * binding (server-to-server, no worker→worker 1042). The canon catalog is
 * injected from ui-schema.json (bundled at build time — no node:fs).
 */
import { forge } from '@p31ca/ui-forge/src/center.mjs';
import { runGate, AXES } from '@p31ca/ui-forge/src/gate.mjs';
import uiSchema from '../../src/forge-schema.json';

interface ForgeEnv {
  PHOS_AI_PROXY?: Fetcher;
}

interface ForgeBody {
  title?: string;
  entities?: Array<{ name?: string; id?: string; fields?: Array<{ name: string; type: string }>; relations?: unknown[] }>;
  actions?: Array<{ name?: string; id?: string; label?: string; trigger?: string }>;
  k?: number;
}

export const onRequestPost: PagesFunction<ForgeEnv> = async ({ request, env }) => {
  let body: ForgeBody;
  try {
    body = await request.json() as ForgeBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Build the backend spec from the posted shape (entities + actions).
  const spec = {
    title: body.title ?? 'Untitled surface',
    entities: body.entities ?? [],
    actions: body.actions ?? [],
  };

  // The Dreamer's provider: route through the service binding instead of the
  // public URL. The binding fetches phos-ai-proxy server-to-server (no CORS,
  // no 1042). Fall back to a direct fetch if the binding is absent (local dev).
  const providerOpts = {
    endpoint: 'https://phos-ai-proxy/',
    fetchImpl: (url: RequestInfo | URL, init?: RequestInit) => {
      if (env.PHOS_AI_PROXY) return env.PHOS_AI_PROXY.fetch(url, init);
      return fetch(url, init);
    },
    // Workers AI JSON Mode: constrain the Dreamer's output to the ui-schema
    // component tree (closed enum, per-component props). Mandatory fallback
    // to the unconstrained call lives inside defaultProvider.
    schema: uiSchema.schema,
  };

  try {
    const report = await forge(spec, {
      k: body.k ?? 4,
      catalog: uiSchema.catalog,
      providerOpts,
    });
    // Attach the gate verdict as a first-class field for the studio UI.
    return Response.json({
      ok: true,
      artifact: report.artifact,
      gate: report.gate,
      nextGate: report.nextGate,
      survivors: report.survivors,
      kills: report.kills,
      logs: report.logs,
    });
  } catch (e) {
    return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
};

// Keep the gate symbols imported for the ping-style sanity check.
export const _gateForPing = { runGate, AXES };