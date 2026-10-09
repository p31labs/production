import { getLoveEngine } from './loveEngine';
import { getOrCreateDidKey } from './identity';

export interface RobloxLoveEvent {
  reason: string;
  amount: number;
  timestamp: string;
  sessionId: string;
}

export async function syncRobloxLove(): Promise<{
  synced: number;
  totalLove: number;
  events: RobloxLoveEvent[];
  error?: string;
}> {
  const did = await getOrCreateDidKey();
  const res = await fetch(`https://shadow-bridge.trimtab-signal.workers.dev/game/pending-love`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: did }),
  });

  if (!res.ok) {
    return {
      synced: 0,
      totalLove: 0,
      events: [],
      error: `shadow-bridge unreachable: ${res.status}`,
    };
  }

  const { events } = (await res.json()) as { events: RobloxLoveEvent[] };
  const engine = getLoveEngine();
  let totalLove = 0;

  for (const ev of events) {
    const tx = engine.donate(ev.amount, {
      source: 'roblox',
      reason: ev.reason,
      sessionId: ev.sessionId,
    });
    totalLove += tx.amount;
  }

  return { synced: events.length, totalLove, events };
}

export function buildBondingSnapshot() {
  const now = new Date().toISOString();

  return {
    version: 1 as const,
    player: {
      nodeId: 'shell',
      displayName: 'P31 Shell',
      tier: 'seedling' as const,
      xp: 0,
      level: 1,
      completedChallenges: [],
      badges: [],
      buildStreak: 0,
      longestStreak: 0,
      lastBuildDate: now.split('T')[0],
      structureIds: ['dome'],
      totalPiecesPlaced: 0,
      dailyQuests: [],
      createdAt: now,
    },
    structures: [
      {
        id: 'dome',
        name: 'Bonding Tetra',
        pieces: [],
        rigidity: {
          vertices: 4,
          edges: 6,
          maxwellThreshold: 6,
          coherence: 0.8,
          isRigid: true,
          degreesOfFreedom: 0,
          isOverConstrained: false,
        },
        color: '#4ade80',
      },
    ],
    activeChallenge: null,
    snapshotAt: now,
  };
}
