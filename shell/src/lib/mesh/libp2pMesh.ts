// libp2pMesh — opt-in sovereign browser P2P transport via libp2p WebRTC-Direct.
// PeerJS is the default; toggled by mesh:transport libp2p.
// Signaling via BROS SignalingRoom Durable Object for peer discovery + SDP relay.
//
// ASSUMPTION: BROS has no POST /room/create — rooms are lazily created by the DO
// via idFromName(roomId). WebSocket path is /rooms/{roomId} (BROS fetch handler
// routes /rooms/{id} to the SignalingRoom DO). Protocol is pure message relay —
// any message sent is broadcast to all other connected peers.
import { createLibp2p } from 'libp2p';
import { webRTC } from '@libp2p/webrtc';
import { noise } from '@chainsafe/libp2p-noise';
import type { Libp2p } from 'libp2p';

const BROS_SIGNALING = 'https://bros.trimtab-signal.workers.dev';

let node: Libp2p | null = null;
let signalingWs: WebSocket | null = null;
let mode: 'peerjs' | 'libp2p' = 'peerjs';
let peers = 0;
let lastBroadcast: { type: string; data: unknown; ts: number } | null = null;
let reconnectCount = 0;
let backoffMs = 1000;
const MAX_BACKOFF = 30000;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const syncQueue: Array<{ type: string; data: unknown; ts: number }> = [];

// State-sync callbacks — set by sync.ts on app boot.
let syncHandler: ((type: string, data: unknown) => void) | null = null;
export function onSync(cb: (type: string, data: unknown) => void): void { syncHandler = cb; }

updateHook();

function updateHook(): void {
  if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
    (window as any).__p31_meshTransport = mode;
    (window as any).__p31_meshSync = { peers, lastBroadcast, broadcast: broadcastSync, reconnects: reconnectCount, queueSize: syncQueue.length };
  }
}

export function getTransportMode(): string { return mode; }
export function getLibp2pNode(): Libp2p | null { return node; }
export function getPeers(): number { return peers; }

export async function broadcastSync(type: string, data: unknown): Promise<void> {
  lastBroadcast = { type, data, ts: Date.now() };
  
  // Enqueue to durable outbox first (offline-first)
  try {
    const { enqueue } = await import('../outbox');
    await enqueue('mesh-broadcast', { type, data });
  } catch (err) {
    console.error('[libp2pMesh] Failed to enqueue broadcast:', err);
  }
  
  // Attempt immediate send if online
  if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) {
    syncQueue.push({ type, data, ts: Date.now() });
    updateHook();
    return;
  }
  try {
    const msg = { type: 'sync', syncType: type, data, ts: Date.now() };
    signalingWs.send(JSON.stringify(msg));
    updateHook();
  } catch {}
}

/**
 * Raw broadcast — sends via WebSocket without enqueuing to outbox.
 * Used by the outbox drain handler to avoid circular re-enqueue.
 */
function rawBroadcastSync(type: string, data: unknown): void {
  lastBroadcast = { type, data, ts: Date.now() };
  if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) {
    syncQueue.push({ type, data, ts: Date.now() });
    updateHook();
    return;
  }
  try {
    const msg = { type: 'sync', syncType: type, data, ts: Date.now() };
    signalingWs.send(JSON.stringify(msg));
    updateHook();
  } catch {}
}
export { rawBroadcastSync };

function flushQueue(): void {
  while (syncQueue.length && signalingWs && signalingWs.readyState === WebSocket.OPEN) {
    const item = syncQueue.shift();
    if (item) rawBroadcastSync(item.type, item.data);
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    if (!node) return;
    connectSignaling();
    if (!signalingWs || signalingWs.readyState !== WebSocket.OPEN) {
      backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF);
      scheduleReconnect();
    }
  }, backoffMs);
}

function connectSignaling(): void {
  if (signalingWs && signalingWs.readyState === WebSocket.OPEN) return;
  const roomId = 'p31-libp2p-mesh';
  try {
    const ws = new WebSocket(`${BROS_SIGNALING.replace('https', 'wss')}/rooms/${roomId}`);
    signalingWs = ws;
    ws.onopen = () => {
      if (!node) return;
      try {
        const multiaddrs = node.getMultiaddrs().map(ma => ma.toString());
        ws.send(JSON.stringify({ type: 'announce', peerId: node.peerId.toString(), multiaddrs }));
      } catch {}
      if (backoffMs > 1000) reconnectCount++;
      backoffMs = 1000;
      flushQueue();
      updateHook();
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'announce' && msg.peerId && node && msg.peerId !== node.peerId.toString()) {
          peers++;
          updateHook();
          if (msg.multiaddrs?.length) {
            for (const ma of msg.multiaddrs) {
              node.dial(ma).catch(() => {});
            }
          }
        } else if (msg.type === 'sync' && syncHandler) {
          syncHandler((msg as any).syncType || 'unknown', (msg as any).data);
        }
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => { signalingWs = null; peers = 0; updateHook(); scheduleReconnect(); };
  } catch {}
}

export async function connectLibp2p(): Promise<boolean> {
  if (node) return true;
  try {
    node = await createLibp2p({
      transports: [webRTC()],
      connectionEncrypters: [noise()],
    });
    await node.start();
    connectSignaling();
    mode = 'libp2p';
    updateHook();
    return true;
  } catch {
    mode = 'peerjs';
    updateHook();
    return false;
  }
}

export function disconnectLibp2p(): void {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (signalingWs) {
    try { signalingWs.close(); } catch {}
    signalingWs = null;
  }
  if (node) Promise.resolve(node.stop()).catch(() => {});
  node = null;
  mode = 'peerjs';
  peers = 0;
  syncQueue.length = 0;
  backoffMs = 1000;
  updateHook();
}

export function isLibp2pActive(): boolean {
  return mode === 'libp2p' && node !== null;
}
