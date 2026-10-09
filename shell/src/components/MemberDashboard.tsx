import { useDunaStats } from '../hooks/useDunaStats';
import { useShellStore } from '../store/useShellStore';
import GlassCard from './ui/GlassCard';
import A2ProgressBar from './ui/A2ProgressBar';
import { useFocusTrap } from '../hooks/useFocusTrap';

export default function MemberDashboard() {
  const open = useShellStore((s) => s.dunaOpen);
  const setOpen = useShellStore((s) => s.setDunaOpen);

  const duna = useDunaStats();
  const { panelRef } = useFocusTrap(open, () => setOpen(false));

  const toGo = Math.max(0, duna.target - duna.members);

  if (!open) return null;

  return (
    <div className="akinator-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }} role="dialog" aria-modal="true" aria-labelledby="member-dashboard-title">
      <div className="akinator-panel" ref={panelRef}>
        <div className="akinator-header">
          <span className="akinator-avatar">{'\uD83D\uDE80'}</span>
          <h3 className="akinator-title" id="member-dashboard-title">Network Nation — Duna Countdown</h3>
          <button type="button" className="akinator-close" onClick={() => setOpen(false)} aria-label="Close">{'\u2715'}</button>
        </div>
        <div className="akinator-body" style={{ gap: 'var(--p31-space-tiny)' }}>
          <GlassCard className="akinator-question-card">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>Members</div>
                <div style={{ fontSize: 'var(--p31-scale-2xl)', fontWeight: 700 }}>{duna.members}/{duna.target}</div>
                <div style={{ fontSize: 'var(--p31-scale-sm)', color: 'var(--p31-text-secondary)' }}>{toGo} to go</div>
              </div>
              <div>
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)' }}>Active Ships</div>
                <div style={{ fontSize: 'var(--p31-scale-2xl)', fontWeight: 700 }}>{duna.active}</div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <A2ProgressBar value={duna.members} max={duna.target} />
            </div>
            {duna.members >= duna.target && (
              <div style={{ marginTop: 12, padding: 12, background: 'var(--p31-accent-gold)', color: '#000', borderRadius: 8, textAlign: 'center', fontWeight: 700, fontSize: 'var(--p31-scale-sm)' }}>
                {'\uD83C\uDF89'} DUNA ready! File Articles of Organization at Wyoming Secretary of State.
              </div>
            )}
            {duna.error && (
              <div style={{ marginTop: 12, fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-accent-red)' }}>
                {'\u26A0\uFE0F'} {duna.error}
              </div>
            )}
          </GlassCard>
          <p className="akinator-candidates-hint">
            Wyoming DUNA Act (W.S. 17-31-101 et seq., 2024) — decentralized nonprofit, 100-member threshold. P31 meets all other requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
