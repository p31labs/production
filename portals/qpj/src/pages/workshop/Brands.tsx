import { useState } from 'react';
import { resolveBrandTokens, type BrandId } from '@p31/design-core/theming/theme-store';
import { StatusBadge, GlassPanel, PageHeader } from '@p31/design-core/compositions';
import { BRAND } from '../../lib/brand';

const BRANDS: BrandId[] = ['p31ca', 'phos', 'phosphorus31', 'willow', 'bonding'];

const BRAND_NOTES: Record<BrandId, string> = {
  p31ca: 'Flagship — rebel accent tokens and sunflower glow.',
  phos: 'Phosphor — cool, quiet, wide-tracking.',
  phosphorus31: 'Caretaker — the still, breathing companion portal.',
  willow: 'Soft earth — warm low-chroma surfaces for long sessions.',
  bonding: 'Connection-first — celebration, LOVE semantics, vestibular care.',
};

export function Brands() {
  const [brand, setBrand] = useState<BrandId | null>(null);

  const applyBrand = (next: BrandId) => {
    setBrand(next);
    const tokens = resolveBrandTokens(next);
    const root = document.documentElement;
    Object.entries(tokens).forEach(([key, value]) => {
      root.style.setProperty(key, value as string);
    });
  };

  return (
    <div className="brands">
      <PageHeader
        eyebrow="Multi-brand orchestration"
        title="Brands"
        lede={`Five brands inherit from the same core via the $extends model. Switching here re-paints the jar live — reload restores the ${BRAND.sub} default.`}
      />

      <section className="portal-section" aria-label="Brand switcher">
        <div className="brand-grid">
          {BRANDS.map((b) => (
            <button
              key={b}
              type="button"
              className={`brand-card${brand === b ? ' is-active' : ''}`}
              onClick={() => applyBrand(b)}
              aria-pressed={brand === b}
            >
              <span className="brand-card-head">
                <span className="brand-card-dot" aria-hidden="true" />
                <span className="mono">{b}</span>
                {brand === b && <StatusBadge status="online" label="Active" />}
              </span>
              <span className="brand-card-desc">{BRAND_NOTES[b]}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="portal-section" aria-label="How it works">
        <div className="section-head">
          <span className="section-eyebrow">Model</span>
          <h2>$extends inheritance</h2>
          <p>
            Each brand is a thin <code className="mono">$extends</code> overlay on the base
            token set — only the delta ships.
          </p>
        </div>
        <GlassPanel strong>
          <pre className="code-line">{'// resolveBrandTokens(brand) → CSS custom property map'}</pre>
          <pre className="code-line">{'--p31-accent: <brand accent>;  --p31-glow: <brand glow>;'}</pre>
        </GlassPanel>
      </section>
    </div>
  );
}