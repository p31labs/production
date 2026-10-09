import { useAppStore } from '../../store/useAppStore';
import { useEffectsStore } from '../../store/useEffectsStore';
import { useSensoryStore } from '../../store/useSensoryStore';
import { useThemeStore } from '@p31ca/shell-chrome';
import { coherenceForSpoons } from '../../lib/coherence';

const DENSITY_OPTIONS = ['low', 'medium', 'high'] as const;
const SPEED_OPTIONS = ['low', 'medium', 'high'] as const;

export default function RightSystemHUD() {
  const spoons = useAppStore((s) => s.spoons);
  const { starDensity, starSpeed, warmStars, setStarDensity, setStarSpeed, setWarmStars } = useEffectsStore();
  const { muted, warmLight, calm, setMuted, setWarmLight, setCalm } = useSensoryStore();
  const { theme, setTheme } = useThemeStore();
  const coherence = coherenceForSpoons(spoons);

  return (
    <div className="hud-section">
      <div className="hud-block">
        <div className="hud-block-title">System Status</div>
        <div className="metric-big">Ω {coherence.toFixed(3)}</div>
        <div style={{ fontSize: 10, color: 'var(--p31-text-tertiary)' }}>
          spoons {spoons}/5 · {spoons >= 3 ? 'optimal' : 'conservation'}
        </div>
      </div>

      <div className="hud-section-title">Starfield</div>
      <div className="hud-mode-grid">
        {DENSITY_OPTIONS.map((d) => (
          <button
            key={d}
            type="button"
            className={`hud-mode-btn${starDensity === d ? ' hud-mode-btn--active' : ''}`}
            onClick={() => setStarDensity(d)}
          >
            {d}
          </button>
        ))}
      </div>
      <div className="hud-mode-grid">
        {SPEED_OPTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`hud-mode-btn${starSpeed === s ? ' hud-mode-btn--active' : ''}`}
            onClick={() => setStarSpeed(s)}
          >
            {s} speed
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`hud-mode-btn${warmStars ? ' hud-mode-btn--active' : ''}`}
        onClick={() => setWarmStars(!warmStars)}
        style={{ width: '100%' }}
      >
        {warmStars ? 'warm stars on' : 'warm stars off'}
      </button>

      <div className="hud-section-title">Environment</div>
      <div className="hud-mode-grid">
        {(['garden', 'ocean', 'aurora', 'zen', 'volt'] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={`hud-mode-btn${theme === t ? ' hud-mode-btn--active' : ''}`}
            onClick={() => setTheme(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="hud-mode-grid">
        <button
          type="button"
          className={`hud-mode-btn${muted ? ' hud-mode-btn--active' : ''}`}
          onClick={() => setMuted(!muted)}
        >
          {muted ? 'muted on' : 'muted off'}
        </button>
        <button
          type="button"
          className={`hud-mode-btn${warmLight ? ' hud-mode-btn--active' : ''}`}
          onClick={() => setWarmLight(!warmLight)}
        >
          {warmLight ? 'warm light on' : 'warm light off'}
        </button>
        <button
          type="button"
          className={`hud-mode-btn${calm ? ' hud-mode-btn--active' : ''}`}
          onClick={() => setCalm(!calm)}
        >
          {calm ? 'calm on' : 'calm off'}
        </button>
      </div>
    </div>
  );
}
