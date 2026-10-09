import type { LoomEventInput } from '@p31ca/canon/loom/gate';
import { guardAgentEvent } from '../_lib/log';
import type { LoomPagesEnv } from '../_lib/log';

/**
 * POST /api/loom/gateway/decide — Agent Gateway service-extension prototype.
 *
 * Google's Agent Gateway is a programmable data plane where ISVs inject
 * decision logic into the agent request path: the gateway sends request
 * metadata, the service extension returns a verdict. This endpoint is that
 * service-extension surface for The Loom: it accepts an incoming agent action
 * and runs guardAgentEvent — the same pre-execution gate the Loom uses for its
 * own agent — then returns allow/refuse + the enforcement mode.
 *
 * Request shape (gateway-style metadata):
 *   {
 *     "agent": { "id": "did:key:...", "kind": "propose" },
 *     "action": { "node": ".feature-card", "id": "p1", "body": { ... } },
 *     "token": "optional Lumi PQC capability token"
 *   }
 *
 * Response:
 *   { "allowed": boolean, "mode": "off"|"observe"|"enforce",
 *     "reason": string|undefined }
 *
 * ⚠️ Prototype: this is the integration artifact for the Google partner
 * conversation, not a full service-extension implementation. It reuses the
 * production gate, so the decision logic is real; the transport is minimal.
 */
export const onRequestPost: PagesFunction<LoomPagesEnv> = async (context) => {
  let body: Record<string, unknown>;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const agent = (body.agent ?? {}) as Record<string, unknown>;
  const action = (body.action ?? {}) as Record<string, unknown>;
  const token = typeof body.token === 'string' ? body.token : undefined;

  const kind = String(action.kind ?? agent.kind ?? 'propose') as LoomEventInput['kind'];
  const input = {
    writer: 'agent' as const,
    kind,
    id: String(action.id ?? 'inbound'),
    node: String(action.node ?? '.inbound'),
    body: (action.body ?? {}) as Record<string, unknown>,
  } as unknown as LoomEventInput;

  const verdict = await guardAgentEvent(context.env, input, token);

  return Response.json(
    {
      allowed: verdict.allowed,
      mode: verdict.mode ?? (context.env.LUMI_ENFORCEMENT === 'enforce' ? 'enforce' : 'off'),
      reason: verdict.reason,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
};