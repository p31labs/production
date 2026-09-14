import { PassportDO } from './passport-do';
import type {
  ExecuteBuildInput,
  ExecuteBuildResult,
  ExecuteInput,
  ExecuteResult,
  IdentityRecord,
  MemoryRecord,
  PassportRequest,
  PassportResponse,
  RecallResult,
  StoreResult,
} from './types';

export { PassportDO };
export { Sandbox } from '@cloudflare/sandbox';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'p31-passport', timestamp: Date.now() });
    }
    if (url.pathname === '/api/status') {
      return handleStatus(request, env);
    }
    if (url.pathname === '/ws') {
      const passportId = url.searchParams.get('passportId') ?? '';
      if (!passportId) {
        return new Response('passportId required', { status: 400 });
      }
      const stub = env.PASSPORT_DO.getByName(passportId);
      return stub.fetch(request);
    }
    let body: PassportRequest;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'invalid JSON body' }, { status: 400 });
    }
    if (!body.passportId) {
      return Response.json({ error: 'passportId required' }, { status: 400 });
    }
    const stub = env.PASSPORT_DO.getByName(body.passportId);
    switch (body.type) {
      case 'execute': return handleExecute(stub, body, env);
      case 'build': return handleBuild(stub, body);
      case 'store': return handleStore(stub, body);
      case 'recall': return handleRecall(stub, body);
      case 'identity': return handleIdentity(stub, body);
      case 'preferences': return handlePreferences(stub, body);
      default: return Response.json({ error: `unsupported type: ${body.type}` }, { status: 400 });
    }
  },
};

type PassportStub = DurableObjectStub<PassportDO>;

async function handleExecute(stub: PassportStub, body: PassportRequest, env: Env): Promise<Response> {
  const sessionId = body.sessionId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    const input: ExecuteInput = {
      goal: body.goal ?? '',
      mode: body.mode ?? 'workshop',
      autonomy: body.autonomy ?? 'advisory',
      sessionId,
    };
    const result = await stub.execute(input);
    return passportJson<PassportResponse>({
      ok: result.ok,
      type: 'execute',
      passportId: body.passportId,
      result: result.result,
      error: result.error,
      sandboxId: result.sandboxId,
      deferred: result.deferred,
      statusUrl: result.statusUrl,
    });
  } catch (e) {
    return passportJson<PassportResponse>(
      { ok: false, type: 'execute', passportId: body.passportId, error: errMsg(e, 'execute failed'), sandboxId: sessionId },
      500,
    );
  }
}

async function handleBuild(stub: PassportStub, body: PassportRequest): Promise<Response> {
  try {
    const input: ExecuteBuildInput = {
      buildId: body.buildId ?? `build-${Date.now()}`,
      code: body.code ?? '',
      filename: body.filename ?? 'artifact.js',
    };
    const result = await stub.executeBuild(input);
    return passportJson<PassportResponse>(
      {
        ok: result.ok,
        type: 'build',
        passportId: body.passportId,
        buildId: result.buildId,
        artifactKey: result.artifactKey,
        error: result.error,
      },
      result.ok ? 200 : 500,
    );
  } catch (e) {
    return passportJson<PassportResponse>(
      { ok: false, type: 'build', passportId: body.passportId, buildId: body.buildId, error: errMsg(e, 'build failed') },
      500,
    );
  }
}

async function handleStore(stub: PassportStub, body: PassportRequest): Promise<Response> {
  try {
    const data = (body.data ?? {}) as Record<string, unknown>;
    return passportJson<PassportResponse>({ ok: true, type: 'store', passportId: body.passportId, result: await stub.store(data) });
  } catch (e) {
    return passportJson<PassportResponse>({ ok: false, type: 'store', passportId: body.passportId, error: errMsg(e, 'store failed') }, 500);
  }
}

async function handleRecall(stub: PassportStub, body: PassportRequest): Promise<Response> {
  try {
    const kind = String((body.data as Record<string, unknown> | undefined)?.['kind'] ?? 'task-outcome');
    return passportJson<PassportResponse>({ ok: true, type: 'recall', passportId: body.passportId, result: await stub.recall(kind) });
  } catch (e) {
    return passportJson<PassportResponse>({ ok: false, type: 'recall', passportId: body.passportId, error: errMsg(e, 'recall failed') }, 500);
  }
}

async function handleIdentity(stub: PassportStub, body: PassportRequest): Promise<Response> {
  try {
    return passportJson<PassportResponse>({ ok: true, type: 'identity', passportId: body.passportId, result: await stub.getIdentity() });
  } catch (e) {
    return passportJson<PassportResponse>({ ok: false, type: 'identity', passportId: body.passportId, error: errMsg(e, 'identity failed') }, 500);
  }
}

async function handlePreferences(stub: PassportStub, body: PassportRequest): Promise<Response> {
  try {
    return passportJson<PassportResponse>({ ok: true, type: 'preferences', passportId: body.passportId, result: await stub.getPreferences() });
  } catch (e) {
    return passportJson<PassportResponse>({ ok: false, type: 'preferences', passportId: body.passportId, error: errMsg(e, 'preferences failed') }, 500);
  }
}

async function handleStatus(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const passportId = url.searchParams.get('passportId') ?? '';
  if (!passportId) return Response.json({ error: 'passportId required' }, { status: 400 });
  try {
    const response = await fetch(`https://${passportId}.qpj-passport.workers.dev/api/status?${url.searchParams.toString()}`);
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return Response.json({ error: errMsg(e, 'status check failed') }, { status: 502 });
  }
}

function passportJson<T>(value: T, status = 200): Response {
  return Response.json(value, { status });
}

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : String(e ?? fallback);
}

export type {
  ExecuteBuildInput,
  ExecuteBuildResult,
  ExecuteInput,
  ExecuteResult,
  IdentityRecord,
  MemoryRecord,
  PassportRequest,
  PassportResponse,
  RecallResult,
  StoreResult,
};