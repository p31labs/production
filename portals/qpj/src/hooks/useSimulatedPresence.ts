import { useEffect } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { PASSENGER_IDS, getPassport, type PassportId } from '../lib/passports';

/**
 * Simulated mesh heartbeat for local demo & offline resilience.
 * In the real mesh the nodes arrive from HeartbeatMesh.onStateUpdate —
 * this module stands in when the mesh is on "lounge" or unreachable.
 */
export function useSimulatedPresence(passportId: PassportId): void {
  const presenceRoom = useQpjStore((s) => s.presenceRoom);
  const updatePresence = useQpjStore((s) => s.updatePresence);

  useEffect(() => {
    let alive = true;

    const seed = `${passportId}:${presenceRoom}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const rnd = (salt: number) => {
      let h = hash ^ salt;
      h = (h << 13) ^ h;
      return ((h * (h * h * 15731 + 789221) + 1376312589) >>> 0) / 4294967296;
    };

    const build = () => {
      const now = Date.now();
      const nodes: Record<string, { did: string; online: boolean; mood?: string | null; spoons?: number; verified?: boolean; lastSeen: number }> = {};
      for (const id of PASSENGER_IDS) {
        if (id === passportId) continue;
        const online = rnd(7) > 0.25;
        nodes[id] = {
          did: `qpj:${id}:${presenceRoom}`,
          online,
          mood: online ? (rnd(9) > 0.5 ? getPassport(id).favorite : 'calm') : null,
          spoons: online ? 1 + Math.floor(rnd(11) * 4) : undefined,
          verified: online,
          lastSeen: now - Math.floor(rnd(13) * 60000),
        };
      }
      return nodes;
    };

    updatePresence(build());
    const interval = window.setInterval(() => {
      if (!alive) return;
      updatePresence(build());
    }, 25000);

    return () => {
      alive = false;
      window.clearInterval(interval);
    };
  }, [passportId, presenceRoom, updatePresence]);
}