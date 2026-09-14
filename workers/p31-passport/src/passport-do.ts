import { DurableObject } from 'cloudflare:workers';
import { getSandbox } from '@cloudflare/sandbox';
import { createWsMeta, handleWsMessage } from './ws-protocol';
import type { WsMeta } from './ws-protocol';
import type {
  ExecuteBuildInput,
  ExecuteBuildResult,
  ExecuteInput,
  ExecuteResult,
  IdentityRecord,
  MemoryRecord,
  RecallResult,
  StoreResult,
  TaskRecord,
} from './types';

export class PassportDO extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.ctx.blockConcurrencyWhile(async () => {
      this.initSchema();
    });
  }

  private initSchema(): void {
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        prompt TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        result TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    this.ctx.storage.sql.exec(`
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
    this.ctx.storage.sql.exec(`
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
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS preferences (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS builds (
        id TEXT PRIMARY KEY,
        passport_id TEXT NOT NULL,
        status TEXT NOT NULL,
        artifact_key TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS artifacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        build_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        content_type TEXT,
        size INTEGER,
        r2_key TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (build_id) REFERENCES builds(id)
      )
    `);
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
      return this.handleWebSocketUpgrade(request);
    }

    const body = (await request.json().catch(() => ({}) as Record<string, unknown>)) as Record<string, unknown>;

    switch (body.type) {
      case 'execute':
        return this.handleExecute(body as Partial<ExecuteInput>);
      case 'build':
        return this.handleBuild(body);
      case 'store':
        return this.handleStore(body);
      case 'recall':
        return this.handleRecall(body);
      case 'identity':
        return this.handleIdentity();
      case 'preferences':
        return this.handlePreferences();
      case 'status':
        return this.handleStatus(body.passportId as string | undefined);
      default:
        return Response.json({ error: `unsupported type: ${String(body.type)}` }, { status: 400 });
    }
  }

  private handleWebSocketUpgrade(request: Request): Response {
    const url = new URL(request.url);
    const passportId = url.searchParams.get('passportId') ?? undefined;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    server.serializeAttachment(createWsMeta(Date.now(), passportId));
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const meta = ws.deserializeAttachment() as WsMeta | null;
    handleWsMessage(message, ws, {
      now: () => Date.now(),
      onStatus: () => this.wsStatus(meta?.passportId),
    });
  }

  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    ws.close();
  }

  webSocketError(_ws: WebSocket, _error: unknown): void {}

  async alarm(): Promise<void> {
    return;
  }

  private notifyBuildUpdate(buildId: string, status: string, artifactKey?: string): void {
    const payload = JSON.stringify({ type: 'buildUpdated', buildId, status, artifactKey });
    for (const socket of this.ctx.getWebSockets()) {
      const meta = socket.deserializeAttachment() as WsMeta | null;
      if (meta?.subscribed) {
        socket.send(payload);
      }
    }
  }

  private wsStatus(passportId?: string): Record<string, unknown> {
    const builds = this.ctx.storage.sql
      .exec('SELECT id, status, created_at FROM builds ORDER BY created_at DESC LIMIT 5')
      .toArray() as SqlStorageRow[];
    return {
      passportId: passportId ?? this.ctx.id.toString(),
      sockets: this.ctx.getWebSockets().length,
      builds: builds.map((r) => ({ id: String(r.id), status: String(r.status), createdAt: r.created_at })),
      ts: Date.now(),
    };
  }

  async execute(input: ExecuteInput): Promise<ExecuteResult> {
    const { goal, mode, autonomy, sessionId } = input;
    const sandboxId = sessionId;

    const task = this.createTask(goal);
    this.updateTaskStatus(task.id, 'thinking');

    this.recallMemory('task-outcome', goal);

    if (autonomy === 'advisory') {
      this.updateTaskStatus(task.id, 'done');
      return {
        ok: true,
        sandboxId,
        result: JSON.stringify({ advisory: true, taskId: task.id, suggested: goal }),
        deferred: false,
      };
    }

    this.updateTaskStatus(task.id, 'error');
    return {
      ok: false,
      sandboxId,
      error: 'sandbox execution not configured (Track A.3)',
      deferred: false,
    };
  }

  async executeBuild(input: ExecuteBuildInput): Promise<ExecuteBuildResult> {
    const { buildId, code, filename } = input;
    const passportId = this.ctx.id.toString();
    const sandboxId = await this.sandboxId();

    this.ctx.storage.sql.exec(
      'INSERT INTO builds (id, passport_id, status) VALUES (?, ?, ?)',
      buildId,
      passportId,
      'running',
    );

    let sandbox: ReturnType<typeof getSandbox> | null = null;
    try {
      sandbox = getSandbox(this.env.Sandbox, sandboxId, {
        sleepAfter: '5m',
        keepAlive: false,
      });

      await sandbox.writeFile(`/workspace/${filename}`, code);
      await sandbox.setKeepAlive(true);

      const process = await sandbox.exec(
        ['npx', 'esbuild', '--bundle', `--outfile=dist/${filename}`, filename],
        { cwd: '/workspace' },
      );
      const exit = await process.waitForExit({ timeout: 120_000 });
      const output = await process.output({ encoding: 'utf8' });

      if (!exit || output.exitCode !== 0) {
        throw new Error(
          output.stderr ? `build failed: ${output.stderr}` : `build failed with exit code ${output.exitCode}`,
        );
      }

      const artifact = await sandbox.readFile(`dist/${filename}`);
      const r2Key = `passports/${passportId}/${buildId}/${filename}`;
      await this.env.ARTIFACTS_BUCKET.put(r2Key, artifact.content, {
        httpMetadata: { contentType: 'application/javascript' },
      });

      await sandbox.setKeepAlive(false);

      this.ctx.storage.sql.exec(
        'INSERT INTO artifacts (build_id, filename, content_type, size, r2_key) VALUES (?, ?, ?, ?, ?)',
        buildId,
        filename,
        'application/javascript',
        artifact.size ?? artifact.content.length,
        r2Key,
      );
      this.ctx.storage.sql.exec(
        'UPDATE builds SET status = ?, artifact_key = ?, updated_at = datetime(\'now\') WHERE id = ?',
        'complete',
        r2Key,
        buildId,
      );

      this.notifyBuildUpdate(buildId, 'complete', r2Key);
      return { ok: true, buildId, artifactKey: r2Key };
    } catch (e) {
      await sandbox?.setKeepAlive(false).catch(() => undefined);
      this.ctx.storage.sql.exec(
        'UPDATE builds SET status = ?, updated_at = datetime(\'now\') WHERE id = ?',
        'failed',
        buildId,
      );
      this.notifyBuildUpdate(buildId, 'failed');
      return { ok: false, buildId, error: errMsg(e) };
    }
  }

  private async sandboxId(): Promise<string> {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(this.ctx.id.toString()),
    );
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40);
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
    const rows = this.ctx.storage.sql
      .exec('SELECT * FROM identities WHERE passport_id = ?', this.ctx.id.toString())
      .toArray() as SqlStorageRow[];
    return (rows[0] as unknown as IdentityRecord | undefined) ?? null;
  }

  async getPreferences(): Promise<Record<string, unknown>> {
    const rows = this.ctx.storage.sql.exec('SELECT key, value FROM preferences').toArray() as SqlStorageRow[];
    const prefs: Record<string, unknown> = {};
    for (const row of rows) {
      try {
        prefs[String(row.key)] = JSON.parse(String(row.value));
      } catch {
        prefs[String(row.key)] = row.value;
      }
    }
    return prefs;
  }

  async storeIdentity(record: IdentityRecord): Promise<void> {
    this.ctx.storage.sql.exec(
      'INSERT OR REPLACE INTO identities (passport_id, did, name, avatar, accent_hue, created_at, verified, pickle_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      record.passportId,
      record.did,
      record.name,
      record.avatar,
      record.accentHue,
      record.createdAt,
      record.verified ? 1 : 0,
      record.pickleName,
    );
  }

  private handleExecute(body: Partial<ExecuteInput>): Response {
    const input: ExecuteInput = {
      goal: body.goal ?? '',
      mode: body.mode ?? 'workshop',
      autonomy: body.autonomy ?? 'advisory',
      sessionId: body.sessionId ?? `${Date.now()}`,
    };
    void this.execute(input);
    return Response.json({ deferred: true, sandboxId: input.sessionId });
  }

  private async handleBuild(body: Record<string, unknown>): Promise<Response> {
    const input: ExecuteBuildInput = {
      buildId: String(body['buildId'] ?? `build-${Date.now()}`),
      code: String(body['code'] ?? ''),
      filename: String(body['filename'] ?? 'artifact.js'),
    };
    return Response.json(await this.executeBuild(input));
  }

  private handleStore(body: Record<string, unknown>): Response {
    const data = (body['data'] ?? {}) as Record<string, unknown>;
    return Response.json(this.store(data));
  }

  private handleRecall(body: Record<string, unknown>): Response {
    const kind = String(body['kind'] ?? 'task-outcome');
    return Response.json(this.recall(kind));
  }

  private handleIdentity(): Response {
    return Response.json(this.getIdentity());
  }

  private handlePreferences(): Response {
    return Response.json(this.getPreferences());
  }

  private handleStatus(passportId?: string): Response {
    return Response.json({ ok: true, type: 'status', result: this.wsStatus(passportId) });
  }

  private createTask(prompt: string): TaskRecord {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = Date.now();
    this.ctx.storage.sql.exec(
      'INSERT INTO tasks (id, prompt, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      id,
      prompt,
      'queued',
      now,
      now,
    );
    return { id, prompt, status: 'queued', createdAt: now, updatedAt: now };
  }

  private updateTaskStatus(taskId: string, status: string): void {
    this.ctx.storage.sql.exec(
      'UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?',
      status,
      Date.now(),
      taskId,
    );
  }

  private updateTaskResult(taskId: string, status: string, result: string): void {
    this.ctx.storage.sql.exec(
      'UPDATE tasks SET status = ?, result = ?, updated_at = ? WHERE id = ?',
      status,
      result,
      Date.now(),
      taskId,
    );
  }

  private storeMemory(kind: string, key: string, value: string): void {
    const now = Date.now();
    this.ctx.storage.sql.exec(
      'INSERT INTO memory (id, kind, key, value, created_at, hit_count) VALUES (?, ?, ?, ?, ?, 1) ' +
        'ON CONFLICT(kind, key) DO UPDATE SET value = excluded.value, hit_count = hit_count + 1, created_at = excluded.created_at',
      `${kind}:${key}:${now}`,
      kind,
      key,
      value,
      now,
    );
  }

  private recallMemory(kind: string, _key: string): MemoryRecord[] {
    const sql = kind
      ? 'SELECT * FROM memory WHERE kind = ? ORDER BY created_at DESC'
      : 'SELECT * FROM memory ORDER BY created_at DESC';
    const rows = (kind
      ? this.ctx.storage.sql.exec(sql, kind)
      : this.ctx.storage.sql.exec(sql)
    ).toArray() as SqlStorageRow[];
    return rows.map((r) => ({
      id: String(r.id),
      kind: String(r.kind) as MemoryRecord['kind'],
      key: String(r.key),
      value: String(r.value),
      createdAt: Number(r.created_at),
      hitCount: Number(r.hit_count),
    }));
  }

  async sleep(): Promise<void> {}
}

type SqlStorageRow = Record<string, string | number | null>;

function errMsg(e: unknown, fallback = 'sandbox build failed'): string {
  return e instanceof Error ? e.message : String(e ?? fallback);
}