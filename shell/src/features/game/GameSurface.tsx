import { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getOrCreateDidKey } from '../../lib/identity';
import { gameBuilder, type GameWorld, type MintStatusResult, type MintStatusPlayer, type MintStatusSession } from '../../lib/gameBuilder';
import { syncRobloxLove } from '../../lib/robloxBridge';
import { spoonTint } from '../../lib/meatspace/game';
import GlassCard from '../../components/ui/GlassCard';
import PageHeader from '../../components/PageHeader';

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--p31-surface2, oklch(22% 0.02 240))',
  color: 'var(--p31-text, oklch(96% 0.005 240))',
  border: '1px solid var(--p31-glass-border, oklch(100% 0.01 240 / 0.16))',
  borderRadius: 'var(--p31-radius-sm, 6px)',
  padding: '8px 10px',
  fontSize: 'var(--p31-scale-xs)',
  minHeight: 44,
  boxSizing: 'border-box',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontSize: 'var(--p31-scale-xs)',
  color: 'var(--p31-text-secondary)',
};

const formGridStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--p31-space-xs)',
};

export default function GameSurface() {
  const spoons = useAppStore((s) => s.spoons);
  const refreshLoveBalance = useAppStore((s) => s.refreshLoveBalance);
  const showToast = useAppStore((s) => s.showToast);

  const [did, setDid] = useState<string | null>(null);
  const [worlds, setWorlds] = useState<GameWorld[]>([]);
  const [loading, setLoading] = useState(false);

  const [worldName, setWorldName] = useState('');
  const [worldDesc, setWorldDesc] = useState('');

  const [mintAmount, setMintAmount] = useState(10);
  const [mintReason, setMintReason] = useState('shell_mint');
  const [mintSession, setMintSession] = useState('');

  const [status, setStatus] = useState<MintStatusResult | null>(null);
  const [statusSessionId, setStatusSessionId] = useState('');
  const [actionType, setActionType] = useState('block_placed');
  const [syncing, setSyncing] = useState(false);

  const loadWorlds = useCallback(async () => {
    setLoading(true);
    try {
      const { result } = await gameBuilder.listWorlds();
      setWorlds(result || []);
    } catch (e) {
      showToast(`⚠️ ${(e as Error).message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    getOrCreateDidKey().then(setDid).catch(() => {});
  }, []);

  useEffect(() => {
    loadWorlds();
    refreshLoveBalance?.().catch(() => {});
  }, [loadWorlds, refreshLoveBalance]);

  const handleCreateWorld = useCallback(async () => {
    if (!worldName.trim()) {
      showToast('⚠️ World name is required', 'error');
      return;
    }
    try {
      const { result } = await gameBuilder.createWorld(worldName.trim(), worldDesc.trim() || undefined, did || undefined);
      showToast(`🌍 World created: ${result.name}`, 'success');
      setWorldName('');
      setWorldDesc('');
      loadWorlds();
    } catch (e) {
      showToast(`⚠️ ${(e as Error).message}`, 'error');
    }
  }, [worldName, worldDesc, did, showToast, loadWorlds]);

  const handleMint = useCallback(async () => {
    if (!did || mintAmount <= 0) {
      showToast('⚠️ DID and amount (> 0) required', 'error');
      return;
    }
    try {
      const { result } = await gameBuilder.mintLove(did, mintAmount, mintReason || undefined, mintSession || undefined);
      showToast(`💜 +${result.amount} LOVE minted`, 'success');
      refreshLoveBalance?.().catch(() => {});
      if (statusSessionId) refreshStatus(statusSessionId);
    } catch (e) {
      showToast(`⚠️ ${(e as Error).message}`, 'error');
    }
  }, [did, mintAmount, mintReason, mintSession, showToast, refreshLoveBalance, statusSessionId]);

  const refreshStatus = useCallback(
    async (sessionId?: string) => {
      if (!did && !sessionId) return;
      try {
        const { result } = await gameBuilder.loveStatus(did || undefined, sessionId);
        setStatus(result);
      } catch (e) {
        showToast(`⚠️ ${(e as Error).message}`, 'error');
      }
    },
    [did, showToast],
  );

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleQueueAction = useCallback(async () => {
    if (!did || !statusSessionId) {
      showToast('⚠️ Enter a session id to queue an action', 'error');
      return;
    }
    try {
      const { result } = await gameBuilder.queueLove(did, statusSessionId, actionType);
      showToast(`🎮 ${result.message || `+${result.loveEarned} LOVE queued`}`, 'success');
      refreshStatus(statusSessionId);
    } catch (e) {
      showToast(`⚠️ ${(e as Error).message}`, 'error');
    }
  }, [did, statusSessionId, actionType, showToast, refreshStatus]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await syncRobloxLove();
      if (res.error) {
        showToast(`⚠️ ${res.error}`, 'error');
      } else {
        showToast(`🔄 ${res.synced} Roblox LOVE event${res.synced === 1 ? '' : 's'} synced (+${res.totalLove})`, 'success');
        refreshLoveBalance?.().catch(() => {});
      }
    } catch (e) {
      showToast(`⚠️ ${(e as Error).message}`, 'error');
    } finally {
      setSyncing(false);
    }
  }, [showToast, refreshLoveBalance]);

  useEffect(() => {
    if (import.meta.env.MODE !== 'production' || (typeof window !== 'undefined' && (window as any).__P31_VERIFY__)) {
      (window as any).__p31_game = {
        render: true,
        worlds: worlds.length,
        did: did ?? null,
        minted: status?.player?.totalLove ?? 0,
        pending: status?.pendingCount ?? 0,
        session: status?.session?.status ?? null,
      };
    }
  }, [worlds, did, status]);

  const sessionPlayer: MintStatusPlayer | null = status?.player ?? null;
  const sessionMeta: MintStatusSession | null = status?.session ?? null;

  return (
    <div className="game" style={{ padding: 'var(--p31-space-xs)', paddingTop: 0, display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-xs)', height: '100%', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
      <PageHeader
        title="Game Builder"
        icon={<span style={{ fontSize: 28 }}>🎮</span>}
        pageKey="game"
        description="Create worlds and mint LOVE through the game-builder router."
      />

      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gridAutoRows: 'minmax(0, 1fr)', gap: 'var(--p31-space-xs)', alignItems: 'stretch', overflow: 'hidden' }}>

        {/* Worlds list */}
        <GlassCard variant="bash" title={`Worlds (${worlds.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {loading ? (
              <span style={{ color: 'var(--p31-text-tertiary)' }}>Loading worlds…</span>
            ) : worlds.length === 0 ? (
              <span style={{ color: 'var(--p31-text-tertiary)' }}>No worlds yet — create one.</span>
            ) : (
              worlds.map((w) => (
                <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 'var(--p31-scale-sm)' }}>
                  <span style={{ color: 'var(--p31-accent-gold)' }}>🌍</span>
                  <span style={{ flex: 1, color: 'var(--p31-text)' }}>{w.name}</span>
                  <span style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
                    {new Date(w.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
            <button type="button" className="btn ghost" onClick={loadWorlds} style={{ minHeight: 44 }}>↻ Refresh</button>
          </div>
        </GlassCard>

        {/* Create world */}
        <GlassCard variant="bash" title="Create world">
          <div style={formGridStyle}>
            <label style={fieldStyle}>
              Name *
              <input style={inputStyle} value={worldName} onChange={(e) => setWorldName(e.target.value)} placeholder="My Roblox world" />
            </label>
            <label style={fieldStyle}>
              Description
              <input style={inputStyle} value={worldDesc} onChange={(e) => setWorldDesc(e.target.value)} placeholder="Optional" />
            </label>
            <button type="button" className="btn primary" onClick={handleCreateWorld} disabled={!worldName.trim()} style={{ alignSelf: 'flex-start' }}>
              🌍 Create
            </button>
          </div>
        </GlassCard>

        {/* LOVE mint */}
        <GlassCard variant="phos" title="Mint LOVE">
          <div style={formGridStyle}>
            <label style={fieldStyle}>
              Amount
              <input type="number" min={1} style={inputStyle} value={mintAmount} onChange={(e) => setMintAmount(Number(e.target.value))} />
            </label>
            <div style={{ display: 'flex', gap: 'var(--p31-space-xs)' }}>
              <label style={{ ...fieldStyle, flex: 1 }}>
                Reason
                <input style={inputStyle} value={mintReason} onChange={(e) => setMintReason(e.target.value)} />
              </label>
              <label style={{ ...fieldStyle, flex: 1 }}>
                Session id
                <input style={inputStyle} value={mintSession} onChange={(e) => setMintSession(e.target.value)} placeholder="Optional" />
              </label>
            </div>
            <button type="button" className="btn primary" onClick={handleMint} disabled={!did} style={{ alignSelf: 'flex-start' }}>
              💜 Mint {mintAmount > 0 ? mintAmount : ''} LOVE
            </button>
          </div>
        </GlassCard>

        {/* Session status */}
        <GlassCard variant="phos" title="Session status">
          <div style={formGridStyle}>
            <div style={{ display: 'flex', gap: 'var(--p31-space-xs)', alignItems: 'flex-end' }}>
              <label style={{ ...fieldStyle, flex: 1 }}>
                Session id
                <input style={inputStyle} value={statusSessionId} onChange={(e) => setStatusSessionId(e.target.value)} placeholder="Optional" />
              </label>
              <button type="button" className="btn ghost" onClick={() => refreshStatus(statusSessionId || undefined)} style={{ minHeight: 44 }} aria-label="Refresh">↻</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--p31-space-xs)' }}>
              <div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total LOVE</div>
                <div style={{ fontSize: 'var(--p31-scale-md)', color: 'var(--p31-accent-green)', fontWeight: 700 }}>{sessionPlayer?.totalLove ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Pending</div>
                <div style={{ fontSize: 'var(--p31-scale-md)', color: 'var(--p31-accent-gold)', fontWeight: 700 }}>{status?.pendingCount ?? '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session</div>
                <div style={{ fontSize: 'var(--p31-scale-md)', color: spoonTint(spoons), fontWeight: 700 }}>
                  {sessionMeta ? sessionMeta.status : '—'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--p31-space-xs)', alignItems: 'flex-end' }}>
              <label style={{ ...fieldStyle, flex: 1 }}>
                Action type
                <select style={inputStyle} value={actionType} onChange={(e) => setActionType(e.target.value)}>
                  <option value="block_placed">block_placed</option>
                  <option value="chat_message">chat_message</option>
                  <option value="structure_complete">structure_complete</option>
                  <option value="spawn">spawn</option>
                  <option value="milestone_reached">milestone_reached</option>
                </select>
              </label>
              <button type="button" className="btn ghost" onClick={handleQueueAction} disabled={!statusSessionId} style={{ minHeight: 44 }}>
                🎮 Queue
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>
              <span>👤 {sessionPlayer?.playerName ?? did?.slice(0, 18) ?? 'no DID'}</span>
              <button type="button" className="btn ghost" onClick={handleSync} disabled={syncing} style={{ minHeight: 44 }}>
                {syncing ? 'Syncing…' : '🔄 Sync Roblox LOVE'}
              </button>
            </div>
          </div>
        </GlassCard>

      </div>
    </div>
  );
}
