import { GlassPanel } from '@p31/design-core/compositions';
import { PageHeader } from '@p31/design-core/compositions';

const TIERS = [
  { name: 'subtle', cls: 'glass-subtle', desc: '--p31-glass-subtle — barely-there tint. Best for page-level scrims and quiet chrome.' },
  { name: 'default', cls: 'glass-panel', desc: '--p31-glass-default — the workbench default. Panels, cards, and 90% of surfaces.' },
  { name: 'strong', cls: 'glass-strong', desc: '--p31-glass-strong — elevated focus surfaces. Dialogs, overlays, and the topbar.' },
];

export default function GlassLab() {
  return (
    <>
      <PageHeader
        eyebrow="Glassmorphism 2.0"
        title="Glass Lab"
        lede="Three canonical opacity tiers — subtle, default, and strong — each mapped to live tokens and hardened for crisis stillness."
      />

      <section className="portal-section" aria-label="Glass tiers">
        <div className="tier-stack">
          {TIERS.map((t) => (
            <GlassPanel key={t.name} strong className="tier-card">
              <div className={`tier-swatch ${t.cls}`} aria-hidden="true" />
              <div className="tier-meta">
                <span className="tier-name font-mono">{t.name}</span>
                <p className="tier-desc">{t.desc}</p>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      <section className="portal-section" aria-label="Tier specs">
        <div className="section-head">
          <span className="section-eyebrow">Recipe</span>
          <h2>Stacking order</h2>
          <p>Surfaces climb from subtle base scrims to the strong topbar that floats above the starfield.</p>
        </div>
        <GlassPanel strong>
          <pre className="code-line">.topbar        {'/* strong  */ backdrop-filter var(--p31-glass-blur) saturate(1.4)'}</pre>
          <pre className="code-line">.glass-card    {'/* default */ backdrop-filter var(--p31-glass-blur)'}</pre>
          <pre className="code-line">.glass-subtle  {'/* subtle  */ backdrop-filter blur(4px)'}</pre>
        </GlassPanel>
      </section>
    </>
  );
}