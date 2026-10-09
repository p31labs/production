import { useAppStore } from '../../store/useAppStore';
import { useEffectsStore } from '../../store/useEffectsStore';
import { useLarmorAudio } from '../../features/ship/useLarmor';
import LeftDataUploadHUD from './LeftDataUploadHUD';

export default function LeftDataHUD() {
  const spoons = useAppStore((s) => s.spoons);
  const larmorActive = useEffectsStore((s) => s.larmorActive);
  const toggleLarmor = useEffectsStore((s) => s.toggleLarmor);
  const { freq, gain } = useLarmorAudio(spoons >= 3 ? 1 : 0.15);

  return (
    <div className="hud-section">
      <div className="hud-block">
        <div className="hud-block-title">Spoons</div>
        <div className="metric-big">{spoons} / 5</div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: `${(spoons / 5) * 100}%`, background: 'var(--p31-accent-gold, #e0b968)' }} />
        </div>
        <div style={{ fontSize: 10, color: 'var(--p31-text-tertiary)' }}>{spoons >= 3 ? 'Optimal' : 'Conservation'}</div>
      </div>

      <div className="hud-block">
        <div className="hud-block-title">Larmor Engine</div>
        <button
          type="button"
          className={`larmor-toggle ${larmorActive ? 'larmor-toggle--on' : ''}`}
          onClick={toggleLarmor}
          aria-label={larmorActive ? 'Stop Larmor oscillator' : 'Start Larmor oscillator'}
        >
          <span className="larmor-status-dot" />
          {larmorActive ? 'Oscillating' : 'Idle'}
        </button>
        <div className="larmor-readout">
          <span>{freq.toFixed(1)} Hz</span>
          <span>gain {gain.toFixed(4)}</span>
        </div>
      </div>

      <div className="hud-block">
        <div className="hud-block-title">Node Inspector</div>
        <div style={{ fontSize: 10, color: 'var(--p31-text-tertiary)' }}>
          Click a dome node to inspect source.
        </div>
      </div>

      <LeftDataUploadHUD />
    </div>
  );
}
