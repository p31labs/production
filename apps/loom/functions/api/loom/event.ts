import { commitToD1, guardAgentEvent, recordRefusal, type LoomPagesEnv } from './_lib/log';
import type { LoomEventInput } from '@p31ca/canon/loom/gate';
import { codename } from '@p31ca/canon/loom/codename';

interface Env extends LoomPagesEnv {
  LOOM_SSE?: Fetcher;
}

const INTERNAL_HEADER = 'X-Loom-Internal';

/** POST /api/loom/event — validate via the gate and append to D1. */
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let input: LoomEventInput;
  try {
    const body = (await context.request.json()) as { input?: LoomEventInput };
    if (!body.input) return Response.json({ valid: false, error: 'missing input' }, { status: 400 });
    input = body.input;
  } catch {
    return Response.json({ valid: false, error: 'invalid JSON' }, { status: 400 });
  }

  // Writer identity. When Access is ON, the JWT `sub` is authoritative and is
  // BOUND onto any personal event (the client-asserted humanId is ignored —
  // never trust a user ID sent in a form field or URL). When Access is OFF,
  // the interim posture: identity may come from the X-Human-Id header, and a
  // personal event's declared humanId must match it (a promise, not proof —
  // SECURITY.md documents this). A personal event without a matching identity
  // is rejected even in the interim.
  const access = (context.data as { access?: { payload: Record<string, unknown> } }).access;
  // The service-token branch of accessGate sets `data.principal` and re-injects
  // `X-Loom-Principal` on a copied request (Pages' Access integration strips
  // CF-Access-* headers and clobbers context.data on the alias) — read all
  // three, most-reliable first.
  const injected = context.request.headers.get('X-Loom-Principal')?.trim();
  const svcClientId = context.request.headers.get('CF-Access-Client-Id')?.trim();
  const sub = (access?.payload?.sub as string | undefined)
    ?? (context.data as { principal?: string }).principal
    ?? injected
    ?? (svcClientId ? `service:${svcClientId}` : undefined);
  const header = context.request.headers.get('X-Human-Id')?.trim() || undefined;
  const principal = sub ?? header;

  const scope = 'scope' in input && input.scope ? input.scope : 'shared';
  if (scope === 'personal') {
    if (sub) {
      // Access is authoritative — rebind the humanId to the authenticated sub.
      input = { ...input, humanId: sub } as LoomEventInput;
    } else if (!principal || ('humanId' in input && input.humanId ? input.humanId : undefined) !== principal) {
      // Interim: no Access. The declared humanId must match the header identity.
      return Response.json(
        { valid: false, error: `personal event's humanId must match the caller identity (X-Human-Id)` },
        { status: 401 },
      );
    }
  }

  // Action-time scope enforcement (agent-originated events). Operator-gated:
  // runs when LUMI_ENFORCE_SCOPE / LUMI_REQUIRE_TOKEN are 'true' — see
  // guardAgentEvent. The Lumi capability token, when required, travels in the
  // X-Lumi-Token header (never in the event body).
  const lumiToken = context.request.headers.get('X-Lumi-Token')?.trim() || undefined;
  const verdict = await guardAgentEvent(context.env, input, lumiToken);
  const refusalReason = verdict.allowed ? undefined : (verdict.reason ?? 'scope violation');
  if (refusalReason) {
    // The refusal is auditable — it lands in the refusals sidecar (JCS
    // hash-chained like the events log), so "governance that doesn't appear in
    // the audit log doesn't exist" stays true even though the Loom's event
    // interface is frozen.
    await recordRefusal(context.env, {
      ts: new Date().toISOString(),
      mode: verdict.mode ?? 'enforce',
      session: lumiToken ? 'token' : 'anonymous',
      agent: codename('lumi-agent'),
      kind: input.kind,
      node: 'node' in input && input.node ? String(input.node) : '',
      reason: refusalReason,
    }).catch((e) => console.error('[refusal] sidecar append failed', String(e)));
    return Response.json({ valid: false, error: `scope refusal: ${refusalReason}` }, { status: 403 });
  }
  // Observe mode: a would-be refusal was recorded above (mode='observe' from
  // the guard) while the event is allowed to proceed — record it as an
  // observation so the warm-up log shows what enforcement WOULD have refused.
  if (verdict.reason && verdict.mode === 'observe') {
    await recordRefusal(context.env, {
      ts: new Date().toISOString(),
      mode: 'observe',
      session: lumiToken ? 'token' : 'anonymous',
      agent: codename('lumi-agent'),
      kind: input.kind,
      node: 'node' in input && input.node ? String(input.node) : '',
      reason: verdict.reason,
    }).catch((e) => console.error('[observation] sidecar append failed', String(e)));
  }

  try {
    const event = await commitToD1(context.env, input);
    // Low-latency fan-out: tell the SSE Worker's Durable Object to re-read D1
    // and push to connected clients. The Worker also polls D1 as a fallback.
    // Prefers the service binding; falls back to the workers.dev URL with the
    // internal service token. The write path never depends on this.
    const broadcastUrl = new Request('https://loom-sse.local/broadcast', { method: 'POST' });
    if (context.env.LOOM_SSE) {
      // The service binding's callee receives its own env; the second argument
      // is ignored by the runtime, so it is cast (the pre-existing pattern).
      await context.env.LOOM_SSE.fetch(broadcastUrl, context.env as unknown as RequestInit).catch(() => {});
    } else if (context.env.LOOM_SSE_URL && context.env.LOOM_INTERNAL_SECRET) {
      const headers = { [INTERNAL_HEADER]: context.env.LOOM_INTERNAL_SECRET };
      await fetch(`${context.env.LOOM_SSE_URL}/broadcast`, { method: 'POST', headers }).catch(() => {});
    }
    return Response.json({ valid: true, event, subject: sub ?? null });
  } catch (e) {
    return Response.json({ valid: false, error: String(e) }, { status: 400 });
  }
};