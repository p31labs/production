import { WidgetTile } from '../components/WidgetTile';
import { useSpoonsStore } from '../lib/useSpoonsStore';
import { useWidgetLayout } from '../hooks/useWidgetLayout';
import { PRESETS, WIDGETS, DISCLOSURE_MIN_WIDGETS } from '../lib/widgets';

export default function HomeSurface() {
  const { preset, setPreset, widgets, move, reset } = useWidgetLayout();
  const spoons = useSpoonsStore((s) => s.spoons);

  const activePreset = PRESETS.find((p) => p.id === preset)!;
  const disclose = spoons <= 2;
  const expanded = spoons >= 5;
  const visible = disclose ? widgets.slice(0, DISCLOSURE_MIN_WIDGETS) : widgets;

  return (
    <section className="home-container" aria-labelledby="home-title">
      <div className="home-hero">
        <div>
          <h1 id="home-title" className="greeting-h1">Your Capital Machine</h1>
          <p className="surface-sub">{activePreset.emoji} {activePreset.label} — {activePreset.blurb}</p>
        </div>
        <div className="surface-actions">
          <span className="integrity-badge">✓ Hash-chain verified</span>
          <button className="btn btn-glass btn-sm" type="button" onClick={reset} title="Reset widget layout">
            Reset layout
          </button>
        </div>
      </div>

      <div className="seg" role="group" aria-label="Dashboard presets" style={{ marginBottom: 'var(--p31-space-5)' }}>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`seg-btn ${preset === p.id ? 'is-active' : ''}`}
            onClick={() => setPreset(p.id)}
            aria-pressed={preset === p.id}
          >
            {p.emoji} {p.label}
          </button>
        ))}
      </div>

      <div className="launcher-grid" data-expanded={expanded || undefined}>
        {visible.map((id) => {
          const def = WIDGETS[id];
          return (
            <div key={id} className={`widget-card${expanded ? ' widget-card--full' : ''}`}>
              <div className="widget-card__head">
                <span className="widget-card__title">
                  <span aria-hidden="true">{def.emoji}</span> {def.label}
                </span>
                <span className="widget-card__move" aria-label={`Reorder ${def.label}`}>
                  <button type="button" className="btn btn-glass btn-sm" aria-label={`Move ${def.label} up`} onClick={() => move(id, -1)}>↑</button>
                  <button type="button" className="btn btn-glass btn-sm" aria-label={`Move ${def.label} down`} onClick={() => move(id, 1)}>↓</button>
                </span>
              </div>
              <WidgetTile id={id} />
            </div>
          );
        })}
      </div>
    </section>
  );
}