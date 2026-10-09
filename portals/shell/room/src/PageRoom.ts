/// <reference types="@cloudflare/workers-types" />
/**
 * room/src/PageRoom.ts — the page's Yjs Durable Object.
 *
 * One PageRoom per page id (the DO name IS the page id). Same hibernation
 * shape as SessionRoom: `state.acceptWebSocket`, a `blockConcurrencyWhile`
 * reload in `fetch`, and a minimal constructor that runs on every wake.
 *
 * The doc holds a `Y.Text` named `content` — the page IS the content, so it is
 * the full document, not a draft layer. On a 2s debounce the state vector is
 * checkpointed to D1 (`page_versions`), CHUNKED under the 2MB row/BLOB ceiling
 * — a large page must never lose its checkpoint, so the write chunks rather
 * than skips.
 */
import * as Y from 'yjs';
import type { RoomEnv } from './SessionRoom';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;
const CHUNK = 1_500_000; // under the 2MB row/BLOB ceiling (D1 + DO SQLite)

export class PageRoom implements DurableObject {
  private readonly state: DurableObjectState;
  private readonly env: RoomEnv;
  private readonly pageId: string;

  private doc = new Y.Doc();
  private sockets = new Set<WebSocket>();
  private loaded = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(state: DurableObjectState, env: RoomEnv) {
    this.state = state;
    this.env = env;
    this.pageId = state.id.name ?? '';
    this.doc.getText('content');
  }

  async fetch(request: Request): Promise<Response> {
    await this.state.blockConcurrencyWhile(() => this.ensureLoaded());

    const url = new URL(request.url);
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
    void this.verifyCheckpoint();
  }

  /** Verify the latest D1 checkpoint matches its stored hash. A torn write is
   *  logged; the storage doc stays authoritative — verification never fails
   *  the room. */
  private async verifyCheckpoint(): Promise<void> {
    try {
      const rows = await this.env.DB.prepare(
        'SELECT seq, hash, chunk, snapshot FROM page_versions WHERE page_id = ?1 ORDER BY seq DESC, chunk ASC',
      ).bind(this.pageId).all<{ seq: number; hash: string; chunk: number; snapshot: ArrayBuffer }>();
      const all = rows.results ?? [];
      if (all.length === 0) return;
      const latestSeq = all[0].seq;
      const chunks = all.filter((r) => r.seq === latestSeq).sort((a, b) => a.chunk - b.chunk);
      const size = chunks.reduce((n, c) => n + c.snapshot.byteLength, 0);
      const buf = new Uint8Array(size);
      let off = 0;
      for (const c of chunks) {
        buf.set(new Uint8Array(c.snapshot), off);
        off += c.snapshot.byteLength;
      }
      const hash = await sha256Hex(buf);
      if (hash !== all[0].hash) {
        console.warn(`page ${this.pageId}: checkpoint seq ${latestSeq} hash mismatch`);
      }
    } catch {
      /* best-effort: never fail the room over a verification read */
    }
  }

  private handleUpgrade(request: Request): Response {
    const did = request.headers.get('x-p31-did') ?? 'anonymous';
    const pair = new WebSocketPair();
    const server = pair[1];
    this.state.acceptWebSocket(server);
    server.serializeAttachment({ did });
    this.sockets.add(server);

    server.send(this.frameSync(Y.encodeStateAsUpdate(this.doc)));

    return new Response(null, { status: 101, webSocket: server });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    const bytes = message instanceof ArrayBuffer
      ? new Uint8Array(message)
      : new TextEncoder().encode(message);

    if (bytes[0] !== MSG_SYNC) return;
    Y.applyUpdate(this.doc, bytes.slice(1));
    this.scheduleCheckpoint();
    const update = Y.encodeStateAsUpdate(this.doc);
    for (const other of this.sockets) {
      if (other !== ws) other.send(this.frameSync(update));
    }
  }

  webSocketClose(ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): void {
    this.sockets.delete(ws);
  }

  private scheduleCheckpoint(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      const update = Y.encodeStateAsUpdate(this.doc);
      void this.state.storage.put('doc', update);
      void this.persistVersion(update);
    }, 2000);
  }

  private async persistVersion(update: Uint8Array): Promise<void> {
    const hash = await sha256Hex(update);
    // Derive seq from the database, never an in-memory counter — hibernation
    // discards in-memory state, so a reset counter would clobber prior rows.
    const next = await this.env.DB.prepare(
      'SELECT COALESCE(MAX(seq), 0) + 1 AS next FROM page_versions WHERE page_id = ?1',
    ).bind(this.pageId).first<{ next: number }>();
    const seq = next?.next ?? 1;
    const chunks = Math.ceil(update.length / CHUNK);
    for (let i = 0; i < chunks; i++) {
      await this.env.DB.prepare(
        'INSERT OR REPLACE INTO page_versions (page_id, seq, hash, snapshot, chunk, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(this.pageId, seq, hash, update.slice(i * CHUNK, (i + 1) * CHUNK), i, Date.now())
        .run();
    }
  }

  private frameSync(update: Uint8Array): ArrayBuffer {
    const out = new Uint8Array(update.length + 1);
    out[0] = MSG_SYNC;
    out.set(update, 1);
    return out.buffer;
  }
}

async function sha256Hex(input: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', input);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}