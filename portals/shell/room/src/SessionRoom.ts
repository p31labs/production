/// <reference types="@cloudflare/workers-types" />
/**
 * room/src/SessionRoom.ts — the Yjs collaboration Durable Object.
 *
 * One SessionRoom per session id (the DO name IS the session id, via
 * idFromName). It is the only sync authority: clients never merge
 * peer-to-peer — every Yjs update funnels through this object and is
 * rebroadcast to the other sockets. Awareness (presence) is relayed and held
 * in DO memory only; the ledger receives the discrete lifecycle events
 * `session.joined` / `session.left`, never the ephemeral awareness state.
 *
 * Uses the Hibernation API: `state.acceptWebSocket` (not `server.accept`) so
 * an idle room can be evicted; the doc is persisted to `state.storage` on a
 * debounced save and reloaded on wake via `blockConcurrencyWhile`. On
 * hibernation ALL in-memory state is discarded, so the sockets set is rebuilt
 * from `state.getWebSockets()` and each socket's `did` from its attachment.
 */
import * as Y from 'yjs';
import { append } from '../../functions/_lib/ledger';
import type { BusEvent } from '../../src/bus/events';

/** Message framing: the first byte disambiguates a doc update from awareness. */
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

/** The room Worker's bindings (its own wrangler.toml — same D1 database). */
export interface RoomEnv {
  DB: D1Database;
  SESSION_ROOM: DurableObjectNamespace;
  PAGE_ROOM?: DurableObjectNamespace;
}

export class SessionRoom implements DurableObject {
  private readonly state: DurableObjectState;
  private readonly env: RoomEnv;
  private readonly sessionId: string;

  private doc = new Y.Doc();
  private sockets = new Set<WebSocket>();
  private awareness = new Map<WebSocket, Uint8Array>();
  private agentPhase: string | null = null;
  private loaded = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(state: DurableObjectState, env: RoomEnv) {
    this.state = state;
    this.env = env;
    this.sessionId = state.id.name ?? '';
  }

  async fetch(request: Request): Promise<Response> {
    // Lazy-load state once per wake. The constructor runs on every wake and
    // cannot await, so the reload lives here, serialized by the runtime.
    await this.state.blockConcurrencyWhile(() => this.ensureLoaded());

    const url = new URL(request.url);

    // Server → room phase push (notifyAgentPhase). Fire-and-forget from the
    // turn; the room relays the agent's presence to every participant.
    if (url.pathname === '/phase' && request.method === 'POST') {
      const body = (await request.json()) as { phase: string | null };
      this.agentPhase = body.phase;
      this.relayAgentPhase();
      return new Response('ok');
    }

    const upgrade = request.headers.get('Upgrade');
    if (upgrade && upgrade.toLowerCase() === 'websocket') {
      return this.handleUpgrade(request);
    }

    return new Response('not found', { status: 404 });
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    const saved = await this.state.storage.get<Uint8Array>('doc');
    if (saved) Y.applyUpdate(this.doc, saved);
    this.sockets = new Set(this.state.getWebSockets());
    this.loaded = true;
  }

  private didOf(ws: WebSocket): string {
    const meta = ws.deserializeAttachment() as { did?: string } | null;
    return meta?.did ?? 'anonymous';
  }

  private handleUpgrade(request: Request): Response {
    const did = request.headers.get('x-p31-did') ?? 'anonymous';
    const pair = new WebSocketPair();
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ did });
    this.sockets.add(server);

    // Newcomer receives the current draft state, then everyone's awareness.
    server.send(this.frameSync(Y.encodeStateAsUpdate(this.doc)));
    for (const ws of this.sockets) {
      if (ws === server) continue;
      const state = this.awareness.get(ws);
      if (state) server.send(this.frameAwareness(state));
    }

    // The only presence rows the ledger receives: discrete lifecycle events.
    const env = this.env;
    void append(env, { type: 'session.joined', sessionId: this.sessionId, did } as BusEvent, { sessionId: this.sessionId, did, face: 'chat' });

    return new Response(null, { status: 101, webSocket: server });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    const bytes = message instanceof ArrayBuffer
      ? new Uint8Array(message)
      : new TextEncoder().encode(message);

    if (bytes[0] === MSG_SYNC) {
      // Apply the remote update, schedule a debounced save, rebroadcast.
      Y.applyUpdate(this.doc, bytes.slice(1));
      this.scheduleSave();
      const update = Y.encodeStateAsUpdate(this.doc);
      for (const other of this.sockets) {
        if (other !== ws) other.send(this.frameSync(update));
      }
      return;
    }

    if (bytes[0] === MSG_AWARENESS) {
      // Awareness is relayed and held in memory only — never appended.
      this.awareness.set(ws, bytes.slice(1));
      for (const other of this.sockets) {
        if (other !== ws) other.send(this.frameAwareness(bytes.slice(1)));
      }
      return;
    }
  }

  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    const did = this.didOf(ws);
    this.sockets.delete(ws);
    this.awareness.delete(ws);

    for (const other of this.sockets) {
      other.send(this.frameAwareness(new TextEncoder().encode(JSON.stringify({ did, left: true }))));
    }

    const env = this.env;
    void append(env, { type: 'session.left', sessionId: this.sessionId, did } as BusEvent, { sessionId: this.sessionId, did, face: 'chat' });
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.state.storage.put('doc', Y.encodeStateAsUpdate(this.doc));
    }, 2000);
  }

  private relayAgentPhase(): void {
    const state = new TextEncoder().encode(JSON.stringify({ agent: 'p31-shell', phase: this.agentPhase }));
    for (const ws of this.sockets) ws.send(this.frameAwareness(state));
  }

  private frameSync(update: Uint8Array): ArrayBuffer {
    const out = new Uint8Array(update.length + 1);
    out[0] = MSG_SYNC;
    out.set(update, 1);
    return out.buffer;
  }

  private frameAwareness(update: Uint8Array): ArrayBuffer {
    const out = new Uint8Array(update.length + 1);
    out[0] = MSG_AWARENESS;
    out.set(update, 1);
    return out.buffer;
  }
}