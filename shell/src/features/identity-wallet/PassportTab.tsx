import { useMemo } from 'react';
import { useIdentityWallet } from './useIdentityWallet';
import GlassCard from '../../components/ui/GlassCard';
import { CardDataRow } from '../../components/ui/CardDataRow';
import { CardToggle } from '../../components/ui/CardToggle';
import PageHeader from '../../components/PageHeader';
import { useThemeStore, type ThemeId, type AgeTier } from '@p31ca/shell-chrome';
import { useSensoryStore, type FontMode, type TextScale } from '../../store/useSensoryStore';
import { useEffectsStore, type EffectLevel } from '../../store/useEffectsStore';
import { useHistoryStore } from '../../store/useHistoryStore';
import { readAppliedTokens, auditTokens } from '../../lib/contrast';

export default function PassportTab() {
  const { passport, livePassport, careScore, r, phase, mode, spoons } = useIdentityWallet();

  const theme = useThemeStore((s) => s.theme);
  const age = useThemeStore((s) => s.age);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAge = useThemeStore((s) => s.setAge);
  const sensory = useSensoryStore();
  const undoCount = useHistoryStore((s) => s.entries.length);
  const undo = useHistoryStore((s) => s.undo);
  const effects = useEffectsStore();

  const readability = useMemo(() => {
    const rows = auditTokens(readAppliedTokens());
    const min = rows.length ? Math.min(...rows.map((r) => r.lc)) : 0;
    return { min: Math.round(min), rows };
  }, [theme, age, sensory.muted, sensory.warmLight]);

  const live = livePassport;
  const content = passport;

  return (
    <div className="page-fill p31-ambient-bg">
      <PageHeader
        title="Cognitive Passport"
        icon={<span style={{ fontSize: 28 }}>{'\uD83C\uDFE6'}</span>}
        description="Unified v4.1.0 content document + live telemetry, plus sensory preferences"
      />

      <div
        className="profile-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridAutoRows: 196,
          gap: 'var(--p31-space-xs)',
          flex: '1 1 auto',
          minHeight: 0,
        }}
      >
        <GlassCard title="Schema" variant="phos" className="dashboard-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            <CardDataRow label="Version" value={live ? `v${live.version}` : '—'} />
            <CardDataRow
              label="Updated"
              value={live ? new Date(live.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
            />
            <CardDataRow label="Content doc" value={content ? 'v4.1.0' : '—'} />
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>Schema v2</span>
              <span style={{ color: 'var(--p31-accent-green)' }}>Unified</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Cognitive Telemetry" variant="bash" className="dashboard-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            <CardDataRow label="Spoons" value={spoons} />
            <CardDataRow label="Care score" value={careScore.toFixed(2)} />
            <CardDataRow label="Phase / mode" value={<>{phase} · {mode}</>} />
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>r(t) {r.toFixed(2)}</span>
              <span style={{ color: 'var(--p31-accent)' }}>Kuramoto</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard title="Love" variant="willow" className="dashboard-card">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minHeight: 0 }}>
            <CardDataRow label="Sovereignty" value={live?.love?.sovereignty?.toFixed(1) ?? '—'} />
            <CardDataRow label="Performance" value={live?.love?.performance?.toFixed(1) ?? '—'} />
            <CardDataRow label="Frozen" value={live?.love?.frozen?.toFixed(1) ?? '0.0'} />
            <div className="card-meta-row" style={{ marginTop: 'auto' }}>
              <span>LOVE</span>
              <span style={{ color: 'var(--p31-accent-gold)' }}>two-pool</span>
            </div>
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Sensory preferences" variant="bash" style={{ marginTop: 'var(--p31-space-sm)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--p31-space-xs)' }}>
          <div className="cmd-arg" style={{ width: '100%' }}>
            <span>Theme</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeId)}>
              {(['garden', 'ocean', 'aurora', 'zen', 'volt'] as ThemeId[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="cmd-arg" style={{ width: '100%' }}>
            <span>Age tier</span>
            <select value={age} onChange={(e) => setAge(e.target.value as AgeTier)}>
              {(['child', 'teen', 'adult'] as AgeTier[]).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--p31-space-xs)' }}>
          <CardToggle label="Muted colors" description="Chroma ×0.45" checked={sensory.muted} onChange={() => sensory.setMuted(!sensory.muted)} />
          <CardToggle label="Warm light" description="Dusk-friendly amber" checked={sensory.warmLight} onChange={() => sensory.setWarmLight(!sensory.warmLight)} />
          <CardToggle
            label="Comfort text"
            description="1.25× type scale"
            checked={sensory.textScale === 'comfort'}
            onChange={() => sensory.setTextScale(sensory.textScale === 'comfort' ? 'standard' as TextScale : 'comfort')}
          />
          <CardToggle label="Calm mode" description="Zero motion" checked={sensory.calm} onChange={() => sensory.setCalm(!sensory.calm)} />
          <CardToggle label="Focus mode" description="Quiet toasts" checked={sensory.focus} onChange={() => sensory.setFocus(!sensory.focus)} />
          <CardToggle label="Simplify cockpit" description="Two panels per rail" checked={sensory.simple} onChange={() => sensory.setSimple(!sensory.simple)} />
          <CardToggle label="Task hub" description="Spoon forecast" checked={sensory.task} onChange={() => sensory.setTask(!sensory.task)} />
          <CardToggle label="Warm stars" description="Amber starfield" checked={effects.warmStars} onChange={() => effects.setWarmStars(!effects.warmStars)} />
          <CardToggle label="Comet trails" description="Shooting stars" checked={effects.cometTrails} onChange={() => effects.setCometTrails(!effects.cometTrails)} />
        </div>

        <div className="cmd-arg" style={{ width: '100%' }}>
          <span>Font</span>
          <select value={sensory.font} onChange={(e) => sensory.setFont(e.target.value as FontMode)}>
            <option value="standard">Standard (Plus Jakarta Sans)</option>
            <option value="hyperlegible">Atkinson Hyperlegible</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--p31-space-xs)' }}>
          <div className="cmd-arg" style={{ width: '100%' }}>
            <span>Star density</span>
            <select value={effects.starDensity} onChange={(e) => effects.setStarDensity(e.target.value as EffectLevel)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="cmd-arg" style={{ width: '100%' }}>
            <span>Star motion</span>
            <select value={effects.starSpeed} onChange={(e) => effects.setStarSpeed(e.target.value as EffectLevel)}>
              <option value="low">Calm drift</option>
              <option value="medium">Medium</option>
              <option value="high">Fast</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <CardToggle label="Dome accent" description="Theme tint" checked={effects.domeAccent} onChange={() => effects.setDomeAccent(!effects.domeAccent)} />
          <CardToggle label="Aurora" description="Slow bands" checked={effects.aurora} onChange={() => effects.setAurora(!effects.aurora)} />
          <CardToggle label="Quantum constellation" description="P31 geometry" checked={effects.quantum} onChange={() => effects.setQuantum(!effects.quantum)} />
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)' }} onClick={effects.resetEffects}>
            ↺ Reset effects
          </button>
          <button type="button" className="btn ghost" style={{ fontSize: 'var(--p31-scale-xs)' }} onClick={undo} disabled={undoCount === 0}>
            ↩ Undo{undoCount > 0 ? ` (${undoCount})` : ''}
          </button>
          <span style={{ fontSize: 'var(--p31-scale-xs)', color: 'var(--p31-text-secondary)' }}>
            Min Lc {readability.min} {readability.min >= 75 ? '· AAA-tier' : readability.min >= 60 ? '· AA-tier' : '· below target'}
          </span>
        </div>
      </GlassCard>
    </div>
  );
}
