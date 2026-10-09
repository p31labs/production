// Mesh transport layer — wires HeartbeatMesh from sovereign-core
// into the shell's store, with signed heartbeats and optional Tailscale/libp2p discovery

import { useAppStore } from '../store/useAppStore';
import { getOrCreateDidKey, signWithDid, getEd25519PubKeyB64, verifyWithDid } from './identity';
import { verifyMldsa65, signMldsa65, getMldsa65PubKeyB64, getOrCreatePqcKey } from './pqc';
import { broadcastKEL, verifyKEL } from './keri';
import { listTailscaleDevices, isTailscaleConfigured } from './tailscale';

// Expose crypto verification functions + mesh peer state for the verify suite.
if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
  (window as any).__p31_meshPeers = [];
  (window as any).__p31_meshTransport = 'peerjs';
  (window as any).__p31_meshVerify = {
    signWithDid,
    verifyWithDid,
    signMldsa65,
    verifyMldsa65,
    getEd25519PubKeyB64,
    getMldsa65PubKeyB64,
    getOrCreatePqcKey,
    getOrCreateDidKey,
  };
  // Expose heartbeat signers for the PQC co-signature gate.
  (window as any).__p31_meshHeartbeat = {
    sign: async (ts: number) => {
      const msg = `mesh-heartbeat|${ts}`;
      const [edSig, pqcSig, pub, pqcPub] = await Promise.all([
        signWithDid(msg),
        signMldsa65(msg),
        getEd25519PubKeyB64(),
        getMldsa65PubKeyB64(),
      ]);
      return { msg, signature: edSig, mldsa65Sig: pqcSig?.sigB64 ?? null, pub, mldsa65Pub: pqcPub };
    },
  };
  // Expose KEL chain verification for the KEL gate (Path E′).
  (window as any).__p31_meshKEL = {
    chain: async () => {
      const kel = await broadcastKEL();
      if (!kel.length) return null;
      const prefix = await (await import('./keri')).initializeKEL();
      return { events: kel, prefix, ok: await verifyKEL(kel, prefix ?? undefined) };
    },
    verify: verifyKEL,
  };
}

let meshInterval: number | null = null;

export async function connectMesh(): Promise<string> {
  const did = await getOrCreateDidKey();
  const app = useAppStore.getState();

  // Try libp2p first (browser WebRTC-Direct); PeerJS is the fallback message layer.
  try {
    const { connectLibp2p } = await import('./mesh/libp2pMesh');
    await connectLibp2p();
  } catch { /* fall through to PeerJS */ }

  // State sync over BROS signaling (independent of P2P transport).
  try {
    const { startStateSync } = await import('./mesh/sync');
    startStateSync();
  } catch { /* offline — no sync */ }

  // Libp2p is the sole transport. Signed heartbeats are handled by sync.ts
  // which periodically broadcasts identity-verified state over the signaling channel.
  // PeerJS-based HeartbeatMesh is deprecated and removed.

  startSignedHeartbeat();

  // Tailscale discovery
  if (isTailscaleConfigured()) {
    try {
      const devices = await listTailscaleDevices();
      for (const d of devices) {
        if (d.name !== did) {
          try {
            const { connectLibp2p: cl } = await import('./mesh/libp2pMesh');
            // Peers are discovered via BROS signaling; Tailscale provides hostname hints only.
          } catch { /* best-effort */ }
        }
      }
    } catch { /* best-effort */ }
  }

  return did;
}

async function startSignedHeartbeat(): Promise<void> {
  if (meshInterval) clearInterval(meshInterval);
  meshInterval = window.setInterval(async () => {
    try {
      const timestamp = Date.now();
      const msg = `mesh-heartbeat|${timestamp}`;
      const pub = await getEd25519PubKeyB64();
      const sig = await signWithDid(msg);
      const pqc = await signMldsa65(msg);
      const pqcPub = await getMldsa65PubKeyB64();
      const kel = await broadcastKEL();
      const { broadcastSync } = await import('./mesh/libp2pMesh');
      broadcastSync('heartbeat', {
        did: (await getOrCreateDidKey()),
        timestamp,
        publicKey: pub ?? undefined,
        signature: sig ?? undefined,
        mldsa65Sig: pqc?.sigB64 ?? undefined,
        mldsa65Pub: pqcPub ?? undefined,
        kelEvents: kel.length ? kel : undefined,
      });
    } catch { /* best-effort */ }
  }, 30_000);
}

export function disconnectMesh(): void {
  if (meshInterval) { clearInterval(meshInterval); meshInterval = null; }
  try {
    import('./mesh/libp2pMesh').then(({ disconnectLibp2p }) => disconnectLibp2p()).catch(() => {});
  } catch {}
}

export function isMeshConnected(): boolean {
  try {
    const { isLibp2pActive } = require('./mesh/libp2pMesh') as any;
    return isLibp2pActive?.() ?? false;
  } catch { return false; }
  return false;
}
