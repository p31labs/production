import { dispatchRoute, type DispatchRequest } from './router';

const dispatchNamespace = 'qpj-dispatch';
const DEFAULT_CPU_MS = 5000;
const DEFAULT_SUB_REQUESTS = 50;

interface Env {
  qpj_dispatch: Fetches;
  SUBSTRATE_ENABLED: string;
  PASSPORT_WORKER_NAMESPACE: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: dispatchNamespace, timestamp: Date.now() });
    }

    if (url.pathname === '/api/goal') {
      return handleGoal(request, env);
    }

    if (url.pathname === '/api/status') {
      return handleStatus(request, env);
    }

    if (url.pathname === '/api/verify') {
      return handleVerify(request, env);
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  },
};

async function handleGoal(request: Request, env: Env): Promise<Response> {
  let body: DispatchRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (!body.passportId) {
    return Response.json({ error: 'passportId required' }, { status: 400 });
  }

  const limitCheck = checkCustomLimits(body);
  if (!limitCheck.allowed) {
    return Response.json({
      ok: false,
      type: 'goal',
      passportId: body.passportId,
      error: 'custom limit exceeded',
      cpuMsUsed: limitCheck.cpuMsUsed,
      subRequestsUsed: limitCheck.subRequestsUsed,
    }, { status: 429 });
  }

  if (env.SUBSTRATE_ENABLED !== 'true') {
    return Response.json({
      ok: false,
      type: 'goal',
      passportId: body.passportId,
      error: 'substrate disabled — set SUBSTRATE_ENABLED=true to activate',
      deferred: true,
    }, { status: 503 });
  }

  const verification = await verifyRequest(body);
  if (!verification.passed) {
    return Response.json({
      ok: false,
      type: 'goal',
      passportId: body.passportId,
      error: 'verification failed',
      auditIssues: verification.issues,
    }, { status: 403 });
  }

  const targetUrl = `https://${body.passportId}.${env.PASSPORT_WORKER_NAMESPACE}.workers.dev`;

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'execute',
        passportId: body.passportId,
        goal: body.goal,
        mode: body.mode,
        autonomy: body.autonomy,
        sessionId: body.sessionId,
      }),
    });

    const result = (await response.json()) as { ok: boolean; deferred?: boolean; statusUrl?: string };

    if (result.deferred) {
      return Response.json({
        ok: true,
        type: 'goal',
        passportId: body.passportId,
        deferred: true,
        statusUrl: result.statusUrl ?? `/api/status?passportId=${body.passportId}`,
        cpuMsUsed: limitCheck.cpuMsUsed,
        subRequestsUsed: limitCheck.subRequestsUsed,
      });
    }

    return Response.json({
      ok: true,
      type: 'goal',
      passportId: body.passportId,
      result,
      cpuMsUsed: limitCheck.cpuMsUsed,
      subRequestsUsed: limitCheck.subRequestsUsed,
    });
  } catch (e) {
    return Response.json({
      ok: false,
      type: 'goal',
      passportId: body.passportId,
      error: String(e?.message ?? 'dispatch failed'),
    }, { status: 502 });
  }
}

async function handleStatus(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const passportId = url.searchParams.get('passportId') ?? '';
  if (!passportId) {
    return Response.json({ error: 'passportId required' }, { status: 400 });
  }

  const targetUrl = `https://${passportId}.${env.PASSPORT_WORKER_NAMESPACE}.workers.dev`;
  try {
    const response = await fetch(`${targetUrl}/api/status?${url.searchParams.toString()}`);
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return Response.json({ error: String(e?.message ?? 'status check failed') }, { status: 502 });
  }
}

async function handleVerify(request: Request, env: Env): Promise<Response> {
  let body: DispatchRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const verification = await verifyRequest(body);
  return Response.json({
    ok: verification.passed,
    type: 'verify',
    passportId: body.passportId,
    auditIssues: verification.issues,
  });
}

async function verifyRequest(body: DispatchRequest): Promise<{ passed: boolean; issues: string[] }> {
  const issues: string[] = [];

  if (!body.passportId || body.passportId.length < 3) {
    issues.push('passportId must be at least 3 characters');
  }

  if (body.goal && body.goal.length > 10000) {
    issues.push('goal exceeds maximum length (10000)');
  }

  if (body.type !== 'goal' && body.type !== 'verify') {
    issues.push(`unsupported request type: ${body.type}`);
  }

  return { passed: issues.length === 0, issues };
}

function checkCustomLimits(body: DispatchRequest): { allowed: boolean; cpuMsUsed: number; subRequestsUsed: number } {
  const cpuMs = Number(body.payload?.['cpuMs'] ?? DEFAULT_CPU_MS);
  const subRequests = Number(body.payload?.['subRequests'] ?? DEFAULT_SUB_REQUESTS);
  return {
    allowed: cpuMs <= DEFAULT_CPU_MS && subRequests <= DEFAULT_SUB_REQUESTS,
    cpuMsUsed: Math.min(cpuMs, DEFAULT_CPU_MS),
    subRequestsUsed: Math.min(subRequests, DEFAULT_SUB_REQUESTS),
  };
}
