import { PassportDO } from './passport-do';
import type { PassportRequest, PassportResponse } from './types';

interface Env {
  PASSPORT_DO: DurableObjectNamespace;
  Sandbox: Sandbox;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/health') {
      return Response.json({ ok: true, service: 'p31-passport', timestamp: Date.now() });
    }

    if (url.pathname === '/api/status') {
      return handleStatus(request, env);
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

    const id = body.passportId;
    const stub = env.PASSPORT_DO.get(id);

    switch (body.type) {
      case 'execute': {
        return handleExecute(stub, body, env);
      }
      case 'store': {
        return handleStore(stub, body);
      }
      case 'recall': {
        return handleRecall(stub, body);
      }
      case 'identity': {
        return handleIdentity(stub, body);
      }
      case 'preferences': {
        return handlePreferences(stub, body);
      }
      default: {
        return Response.json({ error: `unsupported type: ${body.type}` }, { status: 400 });
      }
    }
  },
};

async function handleExecute(stub: DurableObjectStub, body: PassportRequest, env: Env): Promise<Response> {
  const sessionId = body.sessionId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  try {
    const result = await stub.execute({
      goal: body.goal ?? '',
      mode: body.mode ?? 'workshop',
      autonomy: body.autonomy ?? 'advisory',
      sessionId,
    });

    return Response.json({
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
    return Response.json({
      ok: false,
      type: 'execute',
      passportId: body.passportId,
      error: String(e?.message ?? 'execute failed'),
      sandboxId: sessionId,
    }, { status: 500 });
  }
}

async function handleStore(stub: DurableObjectStub, body: PassportRequest): Promise<Response> {
  try {
    const result = await stub.store(body.data ?? {});
    return Response.json({ ok: true, type: 'store', passportId: body.passportId, result });
  } catch (e) {
    return Response.json({ ok: false, type: 'store', passportId: body.passportId, error: String(e?.message ?? 'store failed') }, { status: 500 });
  }
}

async function handleRecall(stub: DurableObjectStub, body: PassportRequest): Promise<Response> {
  try {
    const result = await stub.recall(body.data?.['kind'] as string ?? 'task-outcome');
    return Response.json({ ok: true, type: 'recall', passportId: body.passportId, result });
  } catch (e) {
    return Response.json({ ok: false, type: 'recall', passportId: body.passportId, error: String(e?.message ?? 'recall failed') }, { status: 500 });
  }
}

async function handleIdentity(stub: DurableObjectStub, body: PassportRequest): Promise<Response> {
  try {
    const result = await stub.getIdentity();
    return Response.json({ ok: true, type: 'identity', passportId: body.passportId, result });
  } catch (e) {
    return Response.json({ ok: false, type: 'identity', passportId: body.passportId, error: String(e?.message ?? 'identity failed') }, { status: 500 });
  }
}

async function handlePreferences(stub: DurableObjectStub, body: PassportRequest): Promise<Response> {
  try {
    const result = await stub.getPreferences();
    return Response.json({ ok: true, type: 'preferences', passportId: body.passportId, result });
  } catch (e) {
    return Response.json({ ok: false, type: 'preferences', passportId: body.passportId, error: String(e?.message ?? 'preferences failed') }, { status: 500 });
  }
}
