/**
 * CrossAppStateDO — cross-device state Durable Object for the P31 shell.
 *
 * Single shared blob: { spoons, sensory, dataset, source, timestamp }.
 * SQLite-backed (Cloudflare 2026 default). WebSockets hibernate between
 * messages (BROS SignalingRoom pattern) — $0/idle cost.
 *
 * Routes:
 *   WS   /ws/state            → live state sync + broadcast
 *   GET  /api/shell-state     → read state (keeps shell endpoint contract)
 *   POST /api/shell-state     → merge delta, broadcast
 *   GET  /api/spaceship-state → read state (aliased — shared blob)
 *   POST /api/spaceship-state → merge delta, broadcast
 *   DELETE /api/state         → reset to defaults (privacy "delete remote data")
 */

import { DurableObject } from 'cloudflare:workers';

export interface SensoryState {
  muted: boolean;
  calm: boolean;
  warmLight: boolean;
  font: string;
  textScale: string;
}

export interface CrossAppState {
  spoons: number;
  sensory: SensoryState;
  dataset?: string;
  source?: string;
  timestamp?: number;
}

export interface CrossAppStateEnv {
  CROSS_APP_STATE: DurableObjectNamespace<CrossAppStateDO>;
}

const STATE_KEY = 'default';

const DEFAULT_STATE: CrossAppState = {
  spoons: 4,
  sensory: { muted: false, calm: false, warmLight: false, font: 'standard', textScale: 'standard' },
};

function deepMerge(base: CrossAppState, delta: Partial<CrossAppState>): CrossAppState {
  return {
    spoons: typeof delta.spoons === 'number' ? Math.max(0, Math.min(5, delta.spoons)) : base.spoons,
    sensory: {
      ...base.sensory,
      ...(delta.sensory ?? {}),
    },
    dataset: delta.dataset ?? base.dataset,
    source: delta.source ?? base.source,
    timestamp: Date.now(),
  };
}

export class CrossAppStateDO extends DurableObject<CrossAppStateEnv> {
  private sql!: SqlStorage;

  constructor(state: DurableObjectState, env: CrossAppStateEnv) {
    super(state, env);
    this.sql = state.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS app_state (k TEXT PRIMARY KEY, v TEXT NOT NULL)`);
  }

  private readState(): CrossAppState {
    const row = [...this.sql.exec(`SELECT v FROM app_state WHERE k = ?`, STATE_KEY)];
    if (row.length === 0) return { ...DEFAULT_STATE, sensory: { ...DEFAULT_STATE.sensory } };
    try {
      return JSON.parse((row[0] as { v: string }).v) as CrossAppState;
    } catch {
      return { ...DEFAULT_STATE, sensory: { ...DEFAULT_STATE.sensory } };
    }
  }

  private writeState(state: CrossAppState): void {
    this.sql.exec(`INSERT OR REPLACE INTO app_state (k, v) VALUES (?, ?)`, STATE_KEY, JSON.stringify(state));
  }

  private sendJson(ws: WebSocket, payload: unknown): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  private broadcast(sender: WebSocket | null, state: CrossAppState): void {
    const payload = JSON.stringify({ type: 'state', state });
    for (const ws of this.ctx.getWebSockets()) {
      if (ws !== sender && ws.readyState === WebSocket.OPEN) ws.send(payload);
    }
  }

  private jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.ctx.acceptWebSocket(server);
      this.sendJson(server, { type: 'state', state: this.readState() });
      return new Response(null, { status: 101, webSocket: client });
    }

    const method = request.method;
    const path = url.pathname;

    if (path === '/api/shell-state' || path === '/api/spaceship-state') {
      if (method === 'GET') {
        const state = this.readState();
        const service = path === '/api/shell-state' ? 'p31-shell' : 'spaceship-earth';
        return this.jsonResponse({ service, status: 'ok', state, timestamp: Date.now() });
      }
      if (method === 'POST') {
        let delta: Partial<CrossAppState> = {};
        try { delta = await request.json<Partial<CrossAppState>>(); } catch { /* empty delta */ }
        const next = deepMerge(this.readState(), delta);
        this.writeState(next);
        this.broadcast(null, next);
        return this.jsonResponse({ ok: true, state: next });
      }
      if (method === 'DELETE') {
        const next = { ...DEFAULT_STATE, sensory: { ...DEFAULT_STATE.sensory } };
        this.writeState(next);
        this.broadcast(null, next);
        return this.jsonResponse({ ok: true, state: next, cleared: true });
      }
    }

    return this.jsonResponse({ error: 'Not found' }, 404);
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    let parsed: { type?: string; state?: Partial<CrossAppState> };
    try {
      parsed = JSON.parse(String(message));
    } catch {
      return;
    }

    if (parsed.type === 'state' && parsed.state) {
      const next = deepMerge(this.readState(), parsed.state);
      this.writeState(next);
      this.broadcast(ws, next);
      return;
    }

    if (parsed.type === 'ping') {
      this.sendJson(ws, { type: 'pong', timestamp: Date.now() });
      return;
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    // Hibernation handles the rest; no-op.
  }
}
