import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { useMeshPeers } from '../hooks/useMeshPeers';

export default function StateSnapshot() {
  const spoons = useAppStore((s) => s.spoons);
  const loveBalance = useAppStore((s) => s.loveBalance);
  const unreadCount = useShellStore((s) => s.unreadCount);
  const peers = useMeshPeers();

  // Time context
  const hour = new Date().getHours();
  const timeContext = hour >= 6 && hour < 12 ? '🌅 Morning'
    : hour >= 12 && hour < 18 ? '☀️ Afternoon'
    : hour >= 18 && hour < 22 ? '🌆 Evening'
    : '🌙 Night';

  // Spoon color
  const spoonColor = spoons <= 1 ? 'var(--p31-accent-red)'
    : spoons <= 3 ? 'var(--p31-accent-gold)'
    : 'var(--p31-accent-green)';

  return (
    <div className="state-snapshot" style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--p31-space-sm)',
      padding: 'var(--p31-space-xs) var(--p31-space-sm)',
      background: 'var(--p31-glass-bg)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--p31-border)',
      minHeight: 64,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: spoonColor }}>
        <span style={{ fontSize: 'var(--p31-scale-md)' }}>🥄</span>
        <span style={{ fontWeight: 600 }}>{spoons}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--p31-accent-gold)' }}>
        <span style={{ fontSize: 'var(--p31-scale-md)' }}>💚</span>
        <span style={{ fontWeight: 600 }}>{loveBalance?.availableBalance ?? 0}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: peers > 0 ? 'var(--p31-accent-green)' : 'var(--p31-text-tertiary)' }}>
        <span style={{ fontSize: 'var(--p31-scale-md)' }}>🌐</span>
        <span style={{ fontWeight: 600 }}>{peers} {peers === 1 ? 'peer' : 'peers'}</span>
      </div>

      {unreadCount > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--p31-accent-gold)' }}>
          <span style={{ fontSize: 'var(--p31-scale-md)' }}>🔔</span>
          <span style={{ fontWeight: 600 }}>{unreadCount}</span>
        </div>
      )}

      <div style={{ marginLeft: 'auto', color: 'var(--p31-text-secondary)', fontSize: 'var(--p31-scale-sm)' }}>
        {timeContext}
      </div>
    </div>
  );
}
