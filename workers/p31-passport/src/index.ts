import type { PassportRequest, PassportResponse } from './types';
import type { ExecuteResult, RecallResult, StoreResult, IdentityRecord, MemoryRecord, TaskRecord, ExecuteInput } from './passport-do';

interface Env {
  PASSPORT_DO: DurableObjectNamespace;
  Sandbox: Sandbox;
}

export class PassportDO implements DurableObject {
  private state: DurableObjectState;
  private db: SqlStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.db = state.storage.sqlite;
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, prompt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', result TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS memory (id TEXT PRIMARY KEY, kind TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, created_at INTEGER NOT NULL, hit_count INTEGER NOT NULL DEFAULT 1, UNIQUE(kind, key))`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS identities (passport_id TEXT PRIMARY KEY, did TEXT NOT NULL, name TEXT NOT NULL, avatar TEXT NOT NULL, accent_hue INTEGER NOT NULL, created_at INTEGER NOT NULL, verified INTEGER NOT NULL DEFAULT 1, pickle_name TEXT NOT NULL)`);
    this.db.exec(`CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    switch (body.type) {
      case 'execute': return this.handleExecute(body);
      case 'store': return this.handleStore(body);
      case 'recall': return this.handleRecall(body);
      case 'identity': return this.handleIdentity();
      case 'preferences': return this.handlePreferences();
      default: return Response.json({ error: `unsupported type: ${body.type}` }, { status: 400 });
    }
  }

  async execute(input: ExecuteInput): Promise<ExecuteResult> {
    const { goal, mode, autonomy, sessionId } = input;
    const sandboxId = sessionId;
    const task = this.createTask(goal);
    this.updateTaskStatus(task.id, 'thinking');
    if (autonomy === 'advisory') {
      this.updateTaskStatus(task.id, 'done');
      return { ok: true, sandboxId, result: JSON.stringify({ advisory: true, taskId: task.id }), deferred: false };
    }
    this.updateTaskStatus(task.id, 'working');
    try {
      const sandbox = this.state.ctx.env.Sandbox;
      const result = await sandbox.exec(sandboxId, goal, { mode, autonomy });
      this.updateTaskResult(task.id, 'done', result?.stdout ?? '');
      return { ok: true, sandboxId, result: result?.stdout ?? '', deferred: false };
    } catch (e) {
      const errorMsg = String(e?.message ?? 'sandbox execution failed');
      this.updateTaskResult(task.id, 'error', errorMsg);
      return { ok: false, sandboxId, error: errorMsg, deferred: false };
    }
  }

  async store(data: Record<string, unknown>): Promise<StoreResult> {
    const key = String(data['key'] ?? 'default');
    const value = JSON.stringify(data['value'] ?? data);
    this.storeMemory('preference', key, value);
    return { ok: true, key };
  }

  async recall(kind: string): Promise<RecallResult> {
    const entries = this.recallMemory(kind, '');
    return { entries, total: entries.length };
  }

  async getIdentity(): Promise<IdentityRecord | null> {
    const row = this.db.prepare('SELECT * FROM identities WHERE passport_id = ?').bind(this.state.id).first();
    return row as IdentityRecord | null;
  }

  async getPreferences(): Promise<Record<string, unknown>> {
    const rows = this.db.prepare('SELECT key, value FROM preferences').all();
    const prefs: Record<string, unknown> = {};
    for (const row of rows as { key: string; value: string }[]) {
      try { prefs[row.key] = JSON.parse(row.value); } catch { prefs[row.key] = row.value; }
    }
    return prefs;
  }

  async storeIdentity(record: IdentityRecord): Promise<void> {
    this.db.prepare('INSERT OR REPLACE INTO identities (passport_id, did, name, avatar, accent_hue, created_at, verified, pickle_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(record.passportId, record.did, record.name, record.avatar, record.accentHue, record.createdAt, record.verified ? 1 : 0, record.pickleName)
      .run();
  }

  private handleExecute(body: { goal?: string; mode?: string; autonomy?: string; sessionId?: string }): Response {
    const input: ExecuteInput = { goal: body.goal ?? '', mode: body.mode ?? 'workshop', autonomy: body.autonomy ?? 'advisory', sessionId: body.sessionId ?? `${Date.now()}` };
    this.execute(input).then(() => undefined).catch(() => undefined);
    return Response.json({ deferred: true, sandboxId: input.sessionId });
  }

  private handleStore(body: { data?: Record<string, unknown> }): Response { return Response.json(this.store(body.data ?? {})); }
  private handleRecall(body: { kind?: string }): Response { return Response.json(this.recall(body.kind ?? 'task-outcome')); }
  private handleIdentity(): Response { return Response.json(this.getIdentity()); }
  private handlePreferences(): Response { return Response.json(this.getPreferences()); }

  private createTask(prompt: string): TaskRecord {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    this.db.prepare('INSERT INTO tasks (id, prompt, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(id, prompt, 'queued', now, now).run();
    return { id, prompt, status: 'queued', createdAt: now, updatedAt: now };
  }

  private updateTaskStatus(taskId: string, status: string): void {
    this.db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').bind(status, Date.now(), taskId).run();
  }

  private updateTaskResult(taskId: string, status: string, result: string): void {
    this.db.prepare('UPDATE tasks SET status = ?, result = ?, updated_at = ? WHERE id = ?').bind(status, result, Date.now(), taskId).run();
  }

  private storeMemory(kind: string, key: string, value: string): void {
    this.db.prepare('INSERT INTO memory (id, kind, key, value, created_at, hit_count) VALUES (?, ?, ?, ?, ?, 1) ON CONFLICT(kind, key) DO UPDATE SET value = excluded.value, hit_count = hit_count + 1, created_at = excluded.created_at')
      .bind(`${kind}:${key}:${Date.now()}`, kind, key, value, Date.now()).run();
  }

  private recallMemory(kind: string, key: string): MemoryRecord[] {
    const sql = kind ? 'SELECT * FROM memory WHERE kind = ? ORDER BY created_at DESC' : 'SELECT * FROM memory ORDER BY created_at DESC';
    const rows = this.db.prepare(sql).bind(kind).all() as { id: string; kind: string; key: string; value: string; created_at: number; hit_count: number }[];
    return rows.map((r) => ({ id: r.id, kind: r.kind, key: r.key, value: r.value, createdAt: r.created_at, hitCount: r.hit_count }));
  }

  async sleep(): Promise<void> {}
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
      case 'execute': return handleExecute(stub, body, env);
      case 'store': return handleStore(stub, body);
      case 'recall': return handleRecall(stub, body);
      case 'identity': return handleIdentity(stub, body);
      case 'preferences': return handlePreferences(stub, body);
      default: return Response.json({ error: `unsupported type: ${body.type}` }, { status: 400 });
    }
  },
};

async function handleExecute(stub: DurableObjectStub, body: PassportRequest, env: Env): Promise<Response> {
  const sessionId = body.sessionId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    const result = await stub.execute({ goal: body.goal ?? '', mode: body.mode ?? 'workshop', autonomy: body.autonomy ?? 'advisory', sessionId });
    return Response.json({ ok: result.ok, type: 'execute', passportId: body.passportId, result: result.result, error: result.error, sandboxId: result.sandboxId, deferred: result.deferred, statusUrl: result.statusUrl });
  } catch (e) {
    return Response.json({ ok: false, type: 'execute', passportId: body.passportId, error: String(e?.message ?? 'execute failed'), sandboxId: sessionId }, { status: 500 });
  }
}

async function handleStore(stub: DurableObjectStub, body: PassportRequest): Promise<Response> {
  try { return Response.json({ ok: true, type: 'store', passportId: body.passportId, result: await stub.store(body.data ?? {}) }); }
  catch (e) { return Response.json({ ok: false, type: 'store', passportId: body.passportId, error: String(e?.message ?? 'store failed') }, { status: 500 }); }
}

async function handleRecall(stub: DurableObjectStub, body: PassportRequest): Promise<Response> {
  try { return Response.json({ ok: true, type: 'recall', passportId: body.passportId, result: await stub.recall(body.data?.['kind'] as string ?? 'task-outcome') }); }
  catch (e) { return Response.json({ ok: false, type: 'recall', passportId: body.passportId, error: String(e?.message ?? 'recall failed') }, { status: 500 }); }
}

async function handleIdentity(stub: DurableObjectStub, body: PassportRequest): Promise<Response> {
  try { return Response.json({ ok: true, type: 'identity', passportId: body.passportId, result: await stub.getIdentity() }); }
  catch (e) { return Response.json({ ok: false, type: 'identity', passportId: body.passportId, error: String(e?.message ?? 'identity failed') }, { status: 500 }); }
}

async function handlePreferences(stub: DurableObjectStub, body: PassportRequest): Promise<Response> {
  try { return Response.json({ ok: true, type: 'preferences', passportId: body.passportId, result: await stub.getPreferences() }); }
  catch (e) { return Response.json({ ok: false, type: 'preferences', passportId: body.passportId, error: String(e?.message ?? 'preferences failed') }, { status: 500 }); }
}

async function handleStatus(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const passportId = url.searchParams.get('passportId') ?? '';
  if (!passportId) return Response.json({ error: 'passportId required' }, { status: 400 });
  try {
    const response = await fetch(`https://${passportId}.qpj-passport.workers.dev/api/status?${url.searchParams.toString()}`);
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return Response.json({ error: String(e?.message ?? 'status check failed') }, { status: 502 });
  }
}
