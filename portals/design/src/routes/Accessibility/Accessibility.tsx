import { useEffect, useState } from 'react';
import { StatusBadge, MetricBadge, GlassPanel, Button } from '@p31/design-core/compositions';
import { useSpoonsStore } from '../../lib/useSpoonsStore';
import { PageHeader } from '@p31/design-core/compositions';

const SPOON_RANKS = [
  { n: 0, label: 'crisis', desc: 'Rest overlay, all motion off, urgency dedicated to exiting.' },
  { n: 1, label: 'minimal', desc: 'Glass turns opaque; the starfield dims to a whisper.' },
  { n: 2, label: 'quiet', desc: 'Slow motion factor, low stimulation defaults.' },
  { n: 3, label: 'steady', desc: 'The default cadence — dynamic but calm.' },
  { n: 4, label: 'social', desc: 'Faster transitions, richer spacing.' },
  { n: 5, label: 'celebratory', desc: 'Full energy — LOVE rewards, glow, and motion flourish.' },
];

export default function Accessibility() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const [dyslexia, setDyslexia] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('dyslexia-mode', dyslexia);
    return () => document.body.classList.remove('dyslexia-mode');
  }, [dyslexia]);

  return (
    <>
      <PageHeader
        eyebrow="Neuroinclusion"
        title="Accessibility"
        lede="Contrast ratios, touch targets, and the spoon ladder — the priority order that shapes every P31 surface."
      />

      <section className="portal-section" aria-label="Standards">
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card-value">WCAG</div>
            <div className="stat-card-label">AAA baseline</div>
            <div className="stat-card-sub">Contrast ≥ 7:1 for body text</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">48px</div>
            <div className="stat-card-label">Touch target</div>
            <div className="stat-card-sub">Minimum hit area, per WCAG 2.2</div>
          </div>
          <div className="stat-card">
            <div className="stat-card-value">OKLCH</div>
            <div className="stat-card-label">Color space</div>
            <div className="stat-card-sub">Perceptual uniformity in every hue</div>
          </div>
        </div>
      </section>

      <section className="portal-section" aria-label="Spoon ladder">
        <div className="section-head">
          <span className="section-eyebrow">Live</span>
          <h2>Spoon ladder</h2>
          <p>Dialing to 0 triggers the rest overlay on this portal right now. Try it — then come back.</p>
        </div>
        <GlassPanel strong>
          <div className={`spoon-dial spoon-dial-large`} role="radiogroup" aria-label="Cognitive load">
            {SPOON_RANKS.map((s) => (
              <button
                key={s.n}
                type="button"
                className={`spoon-btn${spoons === s.n ? ' active' : ''}`}
                aria-checked={spoons === s.n}
                onClick={() => setSpoons(s.n)}
              >
                {s.n}
              </button>
            ))}
          </div>
          <div className="spoon-readout">
            <span className="font-mono" data-current>
              level {spoons} — {SPOON_RANKS[spoons].label}
            </span>
            <span className="spoon-readout-desc">{SPOON_RANKS[spoons].desc}</span>
          </div>
        </GlassPanel>
      </section>

      <section className="portal-section" aria-label="Reading aids">
        <div className="section-head">
          <span className="section-eyebrow">Aids</span>
          <h2>Reading supports</h2>
        </div>
        <div className="workbench-grid">
          <GlassPanel strong>
            <div className="feature-tile-title">Dyslexia mode</div>
            <p className="feature-tile-desc">Wider letter spacing, larger reading size, looser line height.</p>
            <Button variant={dyslexia ? 'primary' : 'secondary'} onClick={() => setDyslexia((d) => !d)}>
              <StatusBadge status={dyslexia ? 'online' : 'offline'} label={dyslexia ? 'On' : 'Off'} />
            </Button>
          </GlassPanel>
          <GlassPanel strong>
            <div className="feature-tile-title">At a glance</div>
            <p className="feature-tile-desc">Everything in the topbar is spoon-aware: badges, dial, and the starfield respond live.</p>
            <div className="example-row">
              <StatusBadge status="online" />
              <MetricBadge value={spoons} label="spoons" icon={<span className="status-dot" />} />
            </div>
          </GlassPanel>
        </div>
      </section>
    </>
  );
}