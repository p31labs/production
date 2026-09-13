import type {
  PassportDOState,
  IdentityRecord,
  TaskRecord,
  MemoryRecord,
  ExecuteResult,
  RecallResult,
  StoreResult,
} from './types';

interface ExecuteInput {
  goal: string;
  mode: string;
  autonomy: string;
  sessionId: string;
}

export default class PassportDO implements DurableObject {
  private state: DurableObjectState;
  private db: SqlStorage;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.db = state.storage.sqlite;
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        result TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory (
        id TEXT PRIMARY KEY,
        kind TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        hit_count INTEGER NOT NULL DEFAULT 1,
        UNIQUE(kind, key)
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS identities (
        passport_id TEXT PRIMARY KEY,
        did TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT NOT NULL,
        accent_hue INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        verified INTEGER NOT NULL DEFAULT 1,
        pickle_name TEXT NOT NULL
      )
    `);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    switch (body.type) {
      case 'execute':
        return this.handleExecute(body);
      case 'store':
        return this.handleStore(body);
      case 'recall':
        return this.handleRecall(body);
      case 'identity':
        return this.handleIdentity();
      case 'preferences':
        return this.handlePreferences();
      default:
        return Response.json({ error: `unsupported type: ${body.type}` }, { status: 400 });
    }
  }

  async execute(input: ExecuteInput): Promise<ExecuteResult> {
    const { goal, mode, autonomy, sessionId } = input;
    const sandboxId = `${input.sessionId}`;

    const task = this.createTask(goal);
    this.updateTaskStatus(task.id, 'thinking');

    const memory = this.recallMemory('task-outcome', goal);

    if (autonomy === 'advisory') {
      this.updateTaskStatus(task.id, 'done');
      return {
        ok: true,
        sandboxId,
        result: JSON.stringify({ advisory: true, taskId: task.id, suggested: goal }),
        deferred: false,
      };
    }

    this.updateTaskStatus(task.id, 'working');

    try {
      const sandbox = this.state.ctx.env.Sandbox;
      const result = await sandbox.exec(sandboxId, goal, { mode, autonomy });

      this.updateTaskResult(task.id, 'done', result?.stdout ?? '');
      this.storeMemory('task-outcome', task.id, result?.stdout ?? goal);

      return {
        ok: true,
        sandboxId,
        result: result?.stdout ?? '',
        deferred: false,
      };
    } catch (e) {
      const errorMsg = String(e?.message ?? 'sandbox execution failed');
      this.updateTaskResult(task.id, 'error', errorMsg);
      return {
        ok: false,
        sandboxId,
        error: errorMsg,
        deferred: false,
      };
    }
  }

  async store(data: Record<string, unknown>): Promise<StoreResult> {
    const key = String(data['key'] ?? 'default');
    const value = JSON.stringify(data['value'] ?? data);
    this.storeMemory('preference', key, value);
    return { ok: true, key };
  }

  async recall(kind: string): Promise<RecallResult> {
    const entries = this.recallMemory(kind as any, '');
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
      try {
        prefs[row.key] = JSON.parse(row.value);
      } catch {
        prefs[row.key] = row.value;
      }
    }
    return prefs;
  }

  async storeIdentity(record: IdentityRecord): Promise<void> {
    this.db.prepare(
      'INSERT OR REPLACE INTO identities (passport_id, did, name, avatar, accent_hue, created_at, verified, pickle_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(record.passportId, record.did, record.name, record.avatar, record.accentHue, record.createdAt, record.verified ? 1 : 0, record.pickleName)
      .run();
  }

  private handleExecute(body: { goal?: string; mode?: string; autonomy?: string; sessionId?: string }): Response {
    const input: ExecuteInput = {
      goal: body.goal ?? '',
      mode: body.mode ?? 'workshop',
      autonomy: body.autonomy ?? 'advisory',
      sessionId: body.sessionId ?? `${Date.now()}`,
    };
    this.execute(input).then(() => undefined).catch(() => undefined);
    return Response.json({ deferred: true, sandboxId: input.sessionId });
  }

  private handleStore(body: { data?: Record<string, unknown> }): Response {
    const result = this.store(body.data ?? {});
    return Response.json(result);
  }

  private handleRecall(body: { kind?: string }): Response {
    const result = this.recall(body.kind ?? 'task-outcome');
    return Response.json(result);
  }

  private handleIdentity(): Response {
    const result = this.getIdentity();
    return Response.json(result);
  }

  private handlePreferences(): Response {
    const result = this.getPreferences();
    return Response.json(result);
  }

  private createTask(prompt: string): TaskRecord {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    this.db.prepare(
      'INSERT INTO tasks (id, prompt, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    )
      .bind(id, prompt, 'queued', now, now)
      .run();
    return { id, prompt, status: 'queued', createdAt: now, updatedAt: now };
  }

  private updateTaskStatus(taskId: string, status: string): void {
    const now = Date.now();
    this.db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?').bind(status, now, taskId).run();
  }

  private updateTaskResult(taskId: string, status: string, result: string): void {
    const now = Date.now();
    this.db.prepare('UPDATE tasks SET status = ?, result = ?, updated_at = ? WHERE id = ?').bind(status, result, now, taskId).run();
  }

  private storeMemory(kind: string, key: string, value: string): void {
    const now = Date.now();
    this.db.prepare(
      'INSERT INTO memory (id, kind, key, value, created_at, hit_count) VALUES (?, ?, ?, ?, ?, 1) ' +
      'ON CONFLICT(kind, key) DO UPDATE SET value = excluded.value, hit_count = hit_count + 1, created_at = excluded.created_at',
    )
      .bind(`${kind}:${key}:${now}`, kind, key, value, now)
      .run();
  }

  private recallMemory(kind: string, key: string): MemoryRecord[] {
    const rows = this.db.prepare(
      kind ? 'SELECT * FROM memory WHERE kind = ? ORDER BY created_at DESC' : 'SELECT * FROM memory ORDER BY created_at DESC',
    )
      .bind(kind)
      .all() as { id: string; kind: string; key: string; value: string; created_at: number; hit_count: number }[];
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      key: r.key,
      value: r.value,
      createdAt: r.created_at,
      hitCount: r.hit_count,
    }));
  }

  async sleep(): Promise<void> {
    // Durable Object hibernates — state persists in SQLite automatically
  }
}
