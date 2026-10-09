/**
 * shell/chat/collab/collabStore.ts — the client Yjs collaboration store.
 *
 * One Yjs draft document per session, synced over the room WebSocket. The
 * client applies every remote update with `Y.applyUpdate(doc, update)` — the
 * single sync authority is the SessionRoom DO; clients never merge
 * peer-to-peer. Presence and the agent's phase are relayed frames, held as
 * plain state, never written to the ledger by this layer.
 */
import { create } from 'zustand';
import * as Y from 'yjs';

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

/** A relayed presence entry (a human cursor, or the agent's phase). */
export interface RemotePresence {
  did: string;
  cursor?: { index: number; length: number };
  agent?: string;
  phase?: string | null;
  left?: boolean;
}

export interface CollabState {
  doc: Y.Doc | null;
  connected: boolean;
  presence: Record<string, RemotePresence>;
  /** The agent's relayed phase, when a turn is running. */
  agentPhase: string | null;

  connect(sessionId: string, did: string): void;
  disconnect(): void;
  /** Send a local draft update (the doc's `update` event already does this). */
  sendUpdate(update: Uint8Array): void;
}

let ws: WebSocket | null = null;
let currentDoc: Y.Doc | null = null;

function frameSync(update: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(update.length + 1);
  out[0] = MSG_SYNC;
  out.set(update, 1);
  return out.buffer;
}

function frameAwareness(payload: Uint8Array): ArrayBuffer {
  const out = new Uint8Array(payload.length + 1);
  out[0] = MSG_AWARENESS;
  out.set(payload, 1);
  return out.buffer;
}

export const useCollabStore = create<CollabState>((set, get) => ({
  doc: null,
  connected: false,
  presence: {},
  agentPhase: null,

  connect(sessionId, did) {
    get().disconnect();
    const doc = new Y.Doc();
    currentDoc = doc;
    set({ doc, connected: false, presence: {}, agentPhase: null });

    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/api/session/${encodeURIComponent(sessionId)}/room`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      set({ connected: true });
      // The newcomer announces its presence, then its full starting state.
      send(frameAwareness(new TextEncoder().encode(JSON.stringify({ did }))));
      send(frameSync(Y.encodeStateAsUpdate(doc)));
    };

    ws.onmessage = (ev: MessageEvent<ArrayBuffer | string>) => {
      const raw = typeof ev.data === 'string' ? new TextEncoder().encode(ev.data) : new Uint8Array(ev.data);
      if (raw[0] === MSG_SYNC) {
        const update = raw.slice(1);
        Y.applyUpdate(doc, update);
        return;
      }
      if (raw[0] === MSG_AWARENESS) {
        try {
          const parsed = JSON.parse(new TextDecoder().decode(raw.slice(1))) as RemotePresence;
          const key = parsed.agent ?? parsed.did ?? 'unknown';
          if (parsed.left) {
            const next = { ...get().presence };
            delete next[key];
            set({ presence: next });
          } else {
            set({ presence: { ...get().presence, [key]: parsed } });
            if (parsed.agent) set({ agentPhase: parsed.phase ?? null });
          }
        } catch {
          /* malformed presence frame — ignore */
        }
      }
    };

    ws.onclose = () => set({ connected: false, agentPhase: null });

    // Every local change pushes an update up to the room (which rebroadcasts).
    doc.on('update', (update: Uint8Array) => {
      send(frameSync(update));
    });
  },

  disconnect() {
    if (ws) { ws.close(); ws = null; }
    if (currentDoc) { currentDoc.destroy(); currentDoc = null; }
    set({ doc: null, connected: false, presence: {}, agentPhase: null });
  },

  sendUpdate(update) {
    send(frameSync(update));
  },
}));

function send(data: ArrayBuffer): void {
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
}