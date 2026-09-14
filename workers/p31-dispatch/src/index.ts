import type { DispatchRequest } from './types';

import { passthroughHeaders } from './headers';

const dispatchNamespace = 'qpj-dispatch';
const DEFAULT_CPU_MS = 5000;
const DEFAULT_SUB_REQUESTS = 50;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: dispatchNamespace, timestamp: Date.now() });
    }

    if (url.pathname === '/ws') {
      return env.PASSPORT_WORKER.fetch(request);
    }

    if (url.pathname === '/api/goal') {
      return handleGoal(request, env);
    }

    if (url.pathname === '/api/build') {
      return handleBuild(request, env);
    }

    if (url.pathname === '/api/status') {
      return handleStatus(request, env);
    }

    if (url.pathname === '/api/verify') {
      return handleVerify(request, env);
    }

    if (url.pathname.startsWith('/api/artifacts/') && request.method === 'GET') {
      return handleArtifactProxy(request, env);
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

  if (String(env.SUBSTRATE_ENABLED) !== 'true') {
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

  const targetUrl = `${env.PASSPORT_WORKER_URL}`;
  const bodyToForward = JSON.stringify({
    type: 'execute',
    passportId: body.passportId,
    goal: body.goal,
    mode: body.mode,
    autonomy: body.autonomy,
    sessionId: body.sessionId,
  });

  try {
    const response = await env.PASSPORT_WORKER.fetch(
      new Request(targetUrl, { method: 'POST', headers: passthroughHeaders(request, env), body: bodyToForward }),
    );

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
      error: errMsg(e, 'dispatch failed'),
    }, { status: 502 });
  }
}

async function handleBuild(request: Request, env: Env): Promise<Response> {
  let body: DispatchRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  if (!body.passportId) {
    return Response.json({ error: "passportId required" }, { status: 400 });
  }
  if (!body.buildId || !body.code || !body.filename) {
    return Response.json({ error: 'buildId, code, and filename are required' }, { status: 400 });
  }

  if (String(env.SUBSTRATE_ENABLED) !== 'true') {
    return Response.json({
      ok: false,
      type: 'build',
      passportId: body.passportId,
      error: 'substrate disabled — set SUBSTRATE_ENABLED=true to activate',
    }, { status: 503 });
  }

  const verification = await verifyRequest(body);
  if (!verification.passed) {
    return Response.json({
      ok: false,
      type: 'build',
      passportId: body.passportId,
      error: 'verification failed',
      auditIssues: verification.issues,
    }, { status: 403 });
  }

  const targetUrl = `${env.PASSPORT_WORKER_URL}`;
  try {
    const response = await env.PASSPORT_WORKER.fetch(
      new Request(targetUrl, {
        method: 'POST',
        headers: passthroughHeaders(request, env),
        body: JSON.stringify({
          type: 'build',
          passportId: body.passportId,
          buildId: body.buildId,
          code: body.code,
          filename: body.filename,
        }),
      }),
    );
    const data = (await response.json()) as { ok: boolean; artifactKey?: string; error?: string };
    return Response.json(
      {
        ok: data.ok,
        type: 'build',
        passportId: body.passportId,
        buildId: body.buildId,
        artifactKey: data.artifactKey,
        error: data.error,
      },
      { status: data.ok ? 200 : response.status },
    );
  } catch (e) {
    return Response.json({
      ok: false,
      type: 'build',
      passportId: body.passportId,
      buildId: body.buildId,
      error: errMsg(e, 'build dispatch failed'),
    }, { status: 502 });
  }
}

async function handleStatus(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const passportId = url.searchParams.get('passportId') ?? '';
  if (!passportId) {
    return Response.json({ error: 'passportId required' }, { status: 400 });
  }

  const passportWorkerUrl = `${env.PASSPORT_WORKER_URL}`;
  try {
    const response = await env.PASSPORT_WORKER.fetch(
      new Request(`${passportWorkerUrl}/api/status?${url.searchParams.toString()}`, {
        headers: passthroughHeaders(request, env),
      }),
    );
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return Response.json({ error: errMsg(e, 'status check failed') }, { status: 502 });
  }
}

async function handleArtifactProxy(request: Request, env: Env): Promise<Response> {
  const parts = new URL(request.url).pathname.split('/');
  const passportId = parts[3] ? decodeURIComponent(parts[3]) : '';
  const rest = parts.slice(4).map(decodeURIComponent).join('/');
  if (!passportId || !rest) {
    return Response.json({ error: 'passportId, buildId, and filename required' }, { status: 400 });
  }
  const targetUrl = `${env.PASSPORT_WORKER_URL}/api/artifacts/${passportId}/${rest}`;
  try {
    const response = await env.PASSPORT_WORKER.fetch(
      new Request(targetUrl, { headers: passthroughHeaders(request, env) }),
    );
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return Response.json({ error: errMsg(e, 'artifact fetch failed') }, { status: 502 });
  }
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : String(e ?? fallback);
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

  if (body.type !== 'goal' && body.type !== 'verify' && body.type !== 'build') {
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
