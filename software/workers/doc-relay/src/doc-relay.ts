/**
 * @file doc-relay.ts — DocRelayDO: one Durable Object per document room.
 *
 * Holds the room's Yjs state in memory, persists it to DO storage on every
 * update (so a hibernated or re-created DO can answer a fresh client's
 * syncStep1 with the full room state), and relays sync + awareness to all
 * connected WebSockets.
 */

import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import { RoomRelay } from './room-relay';
import { authorizeRequest, negotiateWebSocketProtocol } from './auth';

export const RELAY_AUDIENCE = 'p31-doc-relay';
export const RELAY_CAPS = ['read', 'write', 'awareness'];

export interface Env {
  DOC_RELAY: DurableObjectNamespace;
  CORS_ALLOW_ORIGIN?: string;
}

interface AwarenessChanges {
  added: number[];
  updated: number[];
  removed: number[];
}

export class DocRelayDO {
  private room: RoomRelay;
  private sockets = new Set<WebSocket>();
  private socketClients = new Map<WebSocket, Set<number>>();

  constructor(private ctx: DurableObjectState, _env: Env) {
    this.room = new RoomRelay();

    this.ctx.blockConcurrencyWhile(async () => {
      // SQLite-backed DO (new_sqlite_classes): persist room state via SQL.
      this.ctx.storage.sql.exec(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value BLOB)`);
      const rows = this.ctx.storage.sql
        .exec(`SELECT value FROM meta WHERE key = 'doc'`)
        .toArray();
      const saved = rows[0]?.value as unknown as Uint8Array | undefined;
      if (saved && saved.length > 0) {
        Y.applyUpdate(this.room.doc, saved);
      }
    });

    this.room.doc.on('update', (update: Uint8Array) => {
      this.ctx.storage.sql.exec(
        `INSERT INTO meta (key, value) VALUES ('doc', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        Y.encodeStateAsUpdate(this.room.doc),
      );
      this.broadcast(RoomRelay.encodeSyncUpdate(update));
    });

    this.room.awareness.on('update', (changes: AwarenessChanges, origin: any) => {
      const changed = changes.added.concat(changes.updated, changes.removed);
      if (changed.length === 0) return;
      if (origin instanceof WebSocket) {
        const clients = this.socketClients.get(origin) ?? new Set<number>();
        for (const client of changes.added) clients.add(client);
        for (const client of changes.removed) clients.delete(client);
        this.socketClients.set(origin, clients);
      }
      this.broadcast(
        RoomRelay.encodeAwareness(this.room.awareness, changed),
        origin instanceof WebSocket ? origin : undefined,
      );
    });
  }

  /**
   * Authorizes a request against a self-contained PQC capability token.
   * Returns the room name or null. See src/auth.ts for the pure logic.
   */
  private async authorize(request: Request): Promise<string | null> {
    return authorizeRequest(request);
  }

  async fetch(request: Request): Promise<Response> {
    const room = await this.authorize(request);

    if (request.headers.get('Upgrade') === 'websocket') {
      if (!room) return new Response('Forbidden: missing or invalid capability token', { status: 403 });
      const pair = new WebSocketPair();
      const [client, server] = [pair[0], pair[1]];
      this.ctx.acceptWebSocket(server);
      this.sockets.add(server);
      // Echo a negotiated subprotocol so the browser completes the handshake
      // (the y-websocket client requests `yjs`; token subprotocol if presented).
      const protocol = negotiateWebSocketProtocol(request);
      return new Response(null, {
        status: 101,
        webSocket: client,
        headers: protocol ? { 'Sec-WebSocket-Protocol': protocol } : undefined,
      });
    }

    if (request.method === 'DELETE') {
      if (!room) return new Response('Forbidden: missing or invalid capability token', { status: 403 });
      this.ctx.storage.sql.exec(`DELETE FROM meta WHERE key = 'doc'`);
      for (const ws of this.sockets) ws.close();
      this.sockets.clear();
      return new Response(null, { status: 204 });
    }

    return new Response('p31-doc-relay — yjs websocket relay', { status: 200 });
  }

  webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): void {
    const buf =
      typeof message === 'string' ? new TextEncoder().encode(message) : new Uint8Array(message);
    this.room.handleMessage(ws, buf);
  }

  webSocketClose(ws: WebSocket): void {
    this.sockets.delete(ws);
    const clients = this.socketClients.get(ws);
    if (clients && clients.size > 0) {
      awarenessProtocol.removeAwarenessStates(this.room.awareness, Array.from(clients), ws);
    }
    this.socketClients.delete(ws);
  }

  webSocketError(ws: WebSocket): void {
    this.webSocketClose(ws);
  }

  private broadcast(buffer: Uint8Array, exclude?: WebSocket): void {
    for (const ws of this.sockets) {
      if (ws === exclude) continue;
      try {
        ws.send(buffer);
      } catch {
        // socket is gone — skip it
      }
    }
  }
}