import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useMeshPeers } from '../hooks/useMeshPeers';
import { getBondingState, subscribeBonding } from '../features/bonding/bondingState';
import { useSyncExternalStore } from 'react';
import GlassCard from './ui/GlassCard';

export default function FamilySnapshotCard() {
  const spoons = useAppStore((s) => s.spoons);
  const loveBalance = useAppStore((s) => s.loveBalance);
  const peers = useMeshPeers();
  const bonding = useSyncExternalStore(subscribeBonding, getBondingState);

  // Recent event (last 8h of activity)
  const recentEvent = useMemo(() => {
    const parts: string[] = [];
    if (bonding.loveDelta > 0) parts.push(`LOVE +${bonding.loveDelta} from rituals`);
    if (peers > 0) parts.push(`${peers} ${peers === 1 ? 'peer' : 'peers'} online`);
    if (parts.length === 0) parts.push('All quiet');
    return parts.join(' • ');
  }, [bonding.loveDelta, peers]);

  // Health trend (simplified - would need 7-day history)
  const healthTrend = spoons >= 4 ? '↗ Steady'
    : spoons >= 2 ? '→ Stable'
    : '↘ Low energy';

  const spoonColor = spoons <= 1 ? 'var(--p31-accent-red)'
    : spoons <= 3 ? 'var(--p31-accent-gold)'
    : 'var(--p31-accent-green)';

  return (
    <GlassCard
      title="Family Snapshot"
      variant="bonding"
    >
      <div style={{ display: 'flex', gap: 'var(--p31-space-xs)', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
        <span style={{ color: spoonColor, fontSize: 'var(--p31-scale-sm)', fontWeight: 600 }}>🥄 {spoons}</span>
        <span style={{ color: 'var(--p31-accent-gold)', fontSize: 'var(--p31-scale-sm)', fontWeight: 600 }}>💚 {loveBalance?.availableBalance ?? 0}</span>
        <span style={{ color: 'var(--p31-accent-green)', fontSize: 'var(--p31-scale-sm)', fontWeight: 600 }}>🌐 {peers}</span>
        <span style={{ color: 'var(--p31-accent)', fontSize: 'var(--p31-scale-sm)', fontWeight: 600 }}>🔗 {bonding.completed.length}</span>
        <span style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginLeft: 'auto' }}>
          {recentEvent} · {healthTrend}
        </span>
      </div>
    </GlassCard>
  );
}
