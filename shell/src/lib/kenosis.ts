import { getOrCreateDidKey } from './identity';
import { useAppStore } from '../store/useAppStore';

let meshInstance: any = null;

export async function connectKenosisMesh(): Promise<boolean> {
  // Kenosis Mesh bridge — loaded dynamically from spaceship-earth when available.
  // Falls back gracefully to the PeerJS mesh (lib/mesh.ts) when not available.
  try {
    const mod = await (Function('return import("@p31ca/spaceship-earth/src/lib/engine/kenosisMesh")')()) as any;
    const { getKenosisMesh } = mod;
    const did = await getOrCreateDidKey();
    const mesh = getKenosisMesh();
    const ok = await mesh.ignite({ persistenceKey: `p31-mesh-${did}` });
    if (ok) {
      meshInstance = mesh;
      mesh.broadcastSpoons(useAppStore.getState().spoons);
      useAppStore.subscribe((state, prev) => {
        if (state.spoons !== prev.spoons) mesh.broadcastSpoons(state.spoons);
      });
      return true;
    }
  } catch {
    // kenosis not available — fall back to PeerJS mesh.ts
  }
  return false;
}

export function disconnectKenosisMesh(): void {
  try { meshInstance?.disconnect?.(); } catch {}
  meshInstance = null;
}
