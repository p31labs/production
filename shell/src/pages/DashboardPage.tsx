import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShellStore } from '../store/useShellStore';
import { useDunaStats } from '../hooks/useDunaStats';
import { useMeshPeers } from '../hooks/useMeshPeers';
import { getForecast, getSpoonHistory } from '../lib/spoonHistory';
import { getBondingState, subscribeBonding } from '../features/bonding/bondingState';
import { useSyncExternalStore } from 'react';
import P31Icon from '../components/P31Icon';
import GlassCard from '../components/ui/GlassCard';
import A2ProgressBar from '../components/ui/A2ProgressBar';
import A2Meter from '../components/ui/A2Meter';
import SpoonGauge from '../components/SpoonGauge';
import MorningAssessmentModal from '../components/MorningAssessmentModal';
import VisitorMindsetModal from '../components/VisitorMindsetModal';
import { useZoneStore } from '../features/hardware/zoneStore';
import FamilySnapshotCard from '../components/FamilySnapshotCard';
import PageHeader from '../components/PageHeader';
import { SERVICES } from '../data/serviceRegistry';

export default function DashboardPage() {
  const spoons = useAppStore((s) => s.spoons);
  const loveBalance = useAppStore((s) => s.loveBalance);
  const refreshLoveBalance = useAppStore((s) => s.refreshLoveBalance);
  const showToast = useAppStore((s) => s.showToast);
  const setDunaOpen = useShellStore((s) => s.setDunaOpen);
  const setMeshOpen = useShellStore((s) => s.setMeshOpen);
  const setTab = useAppStore((s) => s.setTab);

  const [forecast, setForecast] = useState<{ type: string; message: string; confidence: number; hour?: number } | null>(null);
  const [history, setHistory] = useState<{ id: string; level: number; source: string; ts: number }[]>([]);
  const [assessOpen, setAssessOpen] = useState(false);

  const scannerReady = useZoneStore((s) => s.scannerReady);
  const isScanning = useZoneStore((s) => s.isScanning);
  const scanError = useZoneStore((s) => s.error);
  const pendingTransition = useZoneStore((s) => s.pendingTransition);

  const toggleScan = () => {
    if (isScanning) {
      useZoneStore.getState().stopScan();
    } else {
      useZoneStore.getState().startScan();
    }
  };

  const handleZoneAcknowledge = async () => {
    const ev = useZoneStore.getState().pendingTransition;
    if (!ev) return;
    await useZoneStore.getState().acknowledgeTransition();
    showToast(`🌿 You've entered ${ev.toZone.name}`, 'success');
  };

  const peers = useMeshPeers();
  const duna = useDunaStats();
  const bonding = useSyncExternalStore(subscribeBonding, getBondingState);

  useEffect(() => {
    refreshLoveBalance?.().catch((e) => showToast('LOVE balance refresh failed', 'error'));
    getForecast().then(setForecast).catch((e) => showToast('Forecast failed', 'error'));
    getSpoonHistory().then(setHistory).catch((e) => showToast('Spoon history failed', 'error'));
  }, [refreshLoveBalance, spoons]);

  const spoonTint = spoons <= 0 ? 'var(--p31-accent-red)' : spoons <= 2 ? 'var(--p31-accent-gold)' : 'var(--p31-accent-green)';

  const careScore = useMemo(() => {
    const spoonNorm = spoons / 5;
    const loveNorm = loveBalance?.availableBalance ? Math.min(1, loveBalance.availableBalance / 10) : 0;
    const meshNorm = Math.min(1, peers / 4);
    const ritualNorm = Math.min(1, bonding.completed.length / 10);
    return Math.round((spoonNorm * 0.4 + loveNorm * 0.3 + meshNorm * 0.2 + ritualNorm * 0.1) * 100);
  }, [spoons, loveBalance, peers, bonding.completed]);

  const recentLevels = history.slice(-7).map((h) => h.level);
  const spoonTrend = recentLevels.length >= 2
    ? (recentLevels[recentLevels.length - 1] > recentLevels[recentLevels.length - 2] ? '↑' : recentLevels[recentLevels.length - 1] < recentLevels[recentLevels.length - 2] ? '↓' : '→')
    : '→';

  const Sparkline = ({ data, max = 5, tint }: { data: number[]; max?: number; tint?: string }) => (
    <div className="card-sparkline">
      {data.map((v, i) => (
        <div key={i} className="card-sparkline-bar" style={{
          height: Math.max(4, (v / max) * 28),
          background: tint || (v <= 0 ? 'var(--p31-accent-red)' : v <= 2 ? 'var(--p31-accent-gold)' : 'var(--p31-accent-green)'),
        }} />
      ))}
    </div>
  );

  const card = (label: string, value: string | number, sub: string, variant?: string, tint?: string, onClick?: () => void, extra?: React.ReactNode) => (
    <GlassCard
      className="dashboard-card"
      title={label}
      variant={variant as any}
      interactive={!!onClick}
      onClick={onClick}
    >
      <div style={{ fontSize: 'var(--p31-scale-xl)', fontWeight: 800, color: tint || 'var(--p31-text)', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginTop: 4 }}>
        {sub}
      </div>
      {extra}
    </GlassCard>
  );

  return (
    <div className="dashboard page-fill p31-ambient-bg">
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.12, pointerEvents: 'none', zIndex: 0 }}>
        <P31Icon name="nebula-burst" width={300} height={300} style={{ filter: 'blur(0.3px)', color: 'var(--p31-accent)' }} />
      </div>
      <PageHeader
        title="Mission Control"
        icon={<span style={{ fontSize: 28 }}>{'\uD83D\uDCCA'}</span>}
        pageKey="dashboard"
        controls={
          <div style={{ textAlign: 'right', width: 'min(220px, 40vw)' }}>
            <div
              style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}
              title={`Spoons: ${Math.round((spoons / 5) * 40)}%, LOVE: ${Math.round((loveBalance?.availableBalance ? Math.min(1, loveBalance.availableBalance / 10) : 0) * 30)}%, Mesh: ${Math.round(Math.min(1, peers / 4) * 20)}%, Rituals: ${Math.round(Math.min(1, bonding.completed.length / 10) * 10)}%`}
            >
              Care Score
            </div>
            <A2Meter
              value={careScore}
              color={careScore >= 60 ? 'var(--p31-accent-green)' : careScore >= 30 ? 'var(--p31-accent-gold)' : 'var(--p31-accent-red)'}
              label={`${careScore}%`}
            />
          </div>
        }
      />

      <div className="dashboard-grid">
        {/* Row 1 — FamilySnapshot | Spoons | Mesh */}
        <FamilySnapshotCard />

        <GlassCard className="dashboard-card" title="Spoons" variant="willow">
          <div style={{ fontSize: 'var(--p31-scale-xl)', fontWeight: 800, color: spoonTint, lineHeight: 1.1 }}>
            {spoons}/5
          </div>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginTop: 4 }}>
            {forecast?.type === 'dip-ahead' ? `⏱️ ${forecast.message}` : `Trend ${spoonTrend}`}
          </div>
          <div className="card-graph-zone">
            <Sparkline data={recentLevels} tint={spoonTint} />
          </div>
        </GlassCard>

        {card('Mesh Peers', peers, `libp2p WebRTC · ${peers > 0 ? 'live' : 'offline'}`, 'bash', undefined, () => setMeshOpen(true),
          <div className="card-meta-row">
            <span>{peers} active</span>
            <span>{bonding.completed.length} rituals</span>
          </div>
        )}

        {/* Row 2 — LOVE | DUNA | Zone */}
        {card('LOVE Balance', loveBalance?.availableBalance ?? '—', `+${bonding.loveDelta} this session`, 'phos', 'var(--p31-accent-gold)', undefined,
          <div className="card-meta-row">
            <span>+{bonding.loveDelta} Δ</span>
            <span>{bonding.completed.length} done</span>
          </div>
        )}

        {/* Row 2 — DUNA | Zone (Zone moved up from Row 3) */}
        {card('DUNA Progress', `${duna.members}/${duna.target}`, 'Wyoming DAO', 'bonding', undefined, () => setDunaOpen(true),
          <div className="card-graph-zone">
            <A2ProgressBar value={duna.members} max={duna.target} />
          </div>
        )}

        <GlassCard className="dashboard-card" title="Zone sensing" variant="bash">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--p31-space-xs)', height: '100%' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 'var(--p31-scale-sm)', color: 'var(--p31-text-secondary)' }}>
                {!scannerReady
                  ? 'BLE unavailable — enable on a supported tablet.'
                  : isScanning
                    ? 'Listening for nearby beacons…'
                    : 'Scan for nearby zone beacons.'}
              </div>
              {scanError && (
                <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-accent-red)', marginTop: 4 }}>{scanError}</div>
              )}
            </div>
            <button type="button" className="btn primary" onClick={toggleScan} disabled={!scannerReady}>
              {isScanning ? 'Stop' : 'Scan'}
            </button>
          </div>
        </GlassCard>

        {/* Row 3 — Services | Spoon Tide | Spoon Budget */}
        <GlassCard className="dashboard-card" title="Services" variant="phos" onClick={() => setTab('commandHub')}>
          <div style={{ fontSize: 'var(--p31-scale-xl)', fontWeight: 800, color: 'var(--p31-text)', lineHeight: 1.1 }}>
            {SERVICES.length}
          </div>
          <div style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-tertiary)', marginTop: 4 }}>
            services registered
          </div>
          <div className="card-meta-row">
            <span>{SERVICES.filter(s => s.category === 'mcp').length} MCP</span>
            <span>{SERVICES.filter(s => s.category === 'worker').length} workers</span>
          </div>
        </GlassCard>

        {/* Spoon Tide (span 2) | Spoon Budget */}
        {recentLevels.length > 0 && (
          <GlassCard className="dashboard-card" title="Recent spoon tide" variant="willow" style={{ gridColumn: 'span 2' }}>
            <div className="spoon-tide-graph">
              <div className="spoon-tide-legend">
                <span><i className="legend-dot" style={{ background: 'var(--p31-accent-red)' }} />Out</span>
                <span><i className="legend-dot" style={{ background: 'var(--p31-accent-gold)' }} />Low</span>
                <span><i className="legend-dot" style={{ background: 'var(--p31-accent-green)' }} />Steady</span>
              </div>
              <div className="spoon-tide-bars">
                {recentLevels.map((level, i) => {
                  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][(new Date().getDay() - 6 + i + 7) % 7];
                  return (
                    <div key={i} className="spoon-tide-col">
                      <div
                        className="spoon-tide-bar"
                        title={`${day}: ${level} spoon${level === 1 ? '' : 's'}`}
                        style={{
                          height: Math.max(4, (level / 5) * 48),
                          background: level <= 0 ? 'var(--p31-accent-red)' : level <= 2 ? 'var(--p31-accent-gold)' : 'var(--p31-accent-green)',
                          transition: 'height 0.3s ease',
                        }}
                      />
                      <span className="spoon-tide-value">{level}</span>
                      <span className="spoon-tide-day">{day}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        )}

        <GlassCard className="dashboard-card" title="Spoon budget" variant="bonding">
          <SpoonGauge onAssess={() => setAssessOpen(true)} />
        </GlassCard>
      </div>

      {assessOpen && <MorningAssessmentModal onClose={() => setAssessOpen(false)} />}
      {pendingTransition && (
        <VisitorMindsetModal
          event={pendingTransition}
          onAcknowledge={handleZoneAcknowledge}
          onDismiss={() => useZoneStore.getState().dismissTransition()}
        />
      )}
    </div>
  );
}
