const GAME_BUILDER_URL = 'https://game-builder.trimtab-signal.workers.dev/route';

export interface GameWorld {
  id: string;
  name: string;
  description: string;
  creator_did: string;
  created_at: number;
}

export interface GameToolDef {
  route: string;
  description: string;
  target: string;
  method: string;
  endpoint: string;
  input: Record<string, string>;
}

export interface MintStatusSession {
  actions: number;
  loveEarned: number;
  chatMessages: number;
  structuresBuilt: number;
  milestonesHit: number;
  lastMilestone: string;
  status: 'active' | 'completed';
}

export interface MintStatusPlayer {
  playerName: string;
  totalLove: number;
  totalActions: number;
  totalSessions: number;
  sessionStreak: number;
}

export interface MintStatusResult {
  ok: boolean;
  userId: string;
  sessionId: string | null;
  queued: Array<{ reason: string; amount: number; timestamp: string }>;
  pendingCount: number;
  session: MintStatusSession | null;
  player: MintStatusPlayer | null;
  timestamp: string;
}

export interface QueueLoveResult {
  ok: boolean;
  loveEarned: number;
  sessionBonus: number;
  total: number;
  message: string;
}

export interface MintLoveResult {
  ok: boolean;
  userId: string;
  amount: number;
  reason: string;
  sessionId: string;
}

export interface GameBuilderEnvelope<T> {
  ok: boolean;
  route: string;
  target: string;
  status: number;
  result: T;
}

export interface PendingLoveEvent {
  reason: string;
  amount: number;
  timestamp: string;
  sessionId: string;
}

export async function callGameBuilder<T = unknown>(
  route: string,
  payload?: Record<string, unknown>,
): Promise<GameBuilderEnvelope<T>> {
  const res = await fetch(GAME_BUILDER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ route, payload: payload || {} }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error || '';
    } catch {
      // non-JSON error body
    }
    throw new Error(detail || `game-builder ${route} failed (${res.status})`);
  }
  const data = (await res.json()) as GameBuilderEnvelope<T>;
  if (!data.ok) {
    throw new Error(`game-builder ${route} failed (upstream ${data.status})`);
  }
  return data;
}

export const gameBuilder = {
  listWorlds: () => callGameBuilder<GameWorld[]>('worlds.list'),
  createWorld: (name: string, description?: string, creator_did?: string) =>
    callGameBuilder<{ id: string; name: string; description: string }>('worlds.create', {
      name,
      description,
      creator_did,
    }),
  getWorld: (id: string) => callGameBuilder<GameWorld>('worlds.get', { id }),
  mintLove: (userId: string, amount: number, reason?: string, sessionId?: string) =>
    callGameBuilder<MintLoveResult>('love.mint', { userId, amount, reason, sessionId }),
  loveBalance: (userId: string) =>
    callGameBuilder<{ events: PendingLoveEvent[] }>('love.balance', { userId }),
  loveStatus: (userId?: string, sessionId?: string) =>
    callGameBuilder<MintStatusResult>('love.mint_status', { userId, sessionId }),
  queueLove: (userId: string, sessionId: string, actionType: string) =>
    callGameBuilder<QueueLoveResult>('love.queue', { userId, sessionId, actionType }),
  listTools: () => callGameBuilder<{ tools: GameToolDef[] }>('tools.list'),
};
