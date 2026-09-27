import { type ReactNode } from 'react';
import { motion } from 'motion/react';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid } from '../../lib/surface';
import { useThemeStore, THEME_LABELS, THEME_TOKENS, type ThemeId } from '@p31ca/design-core/theming/theme-store';
import { fadeIn, slideUp, staggerChildren } from '../../lib/motionPresets';
import '../../surfaces/brands.css';

const THEME_IDS = Object.keys(THEME_LABELS) as ThemeId[];

function DemoCard({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="chameleon-demo">
      <span className="chameleon-demo__label">{label}</span>
      {children}
    </div>
  );
}

function BrandCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="chameleon-card">
      <span className="chameleon-card__bar" aria-hidden="true" />
      <h4 className="chameleon-card__title">{title}</h4>
      <p className="chameleon-card__body">{body}</p>
    </div>
  );
}

function BrandButton({ children }: { children: ReactNode }) {
  return (
    <button type="button" className="chameleon-btn">
      {children}
    </button>
  );
}

function BrandBadge({ children }: { children: ReactNode }) {
  return (
    <span className="chameleon-badge">
      <span className="chameleon-badge__dot" aria-hidden="true" />
      {children}
    </span>
  );
}

function BrandMetric({ value, label }: { value: string; label: string }) {
  return (
    <div className="chameleon-metric">
      <span className="chameleon-metric__value">{value}</span>
      <span className="chameleon-metric__label">{label}</span>
    </div>
  );
}

/** CHAMELEON — one component library, N canonical themes, no fork. The switcher
 *  consumes the canonical THEME_LABELS + THEME_TOKENS from design-core (the same
 *  source the topbar theme picker uses) and applies via setTheme — no duplicate
 *  palette list in the portal (the prior custom BRANDS array was the drift). */
export default function Brands() {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const applyTheme = useThemeStore((s) => s.applyTheme);

  const pick = (id: ThemeId) => {
    setTheme(id);
    applyTheme();
  };
  const reset = () => pick('ocean');

  return (
    <section className="surface-panel active" data-mcp-tool="brandsSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Chameleon · multi-brand"
          title="Brands"
          lede="One component library, N canonical themes, zero forks. Switching hot-applies the canonical theme tokens (the same set the topbar picker uses) — every demo below recolors live."
        />

        <SurfaceSection title="Brand switcher">
          <div className="brand-switcher glass-tile">
            {THEME_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={`brand-switcher__btn ${theme === id ? 'brand-switcher__btn--active' : ''}`}
                onClick={() => pick(id)}
                aria-pressed={theme === id}
              >
                <span
                  className="brand-switcher__swatch"
                  style={{ background: THEME_TOKENS[id]?.['--p31-accent'] ?? 'oklch(0.73 0.18 195)' }}
                  aria-hidden="true"
                />
                {THEME_LABELS[id]}
              </button>
            ))}
            <button type="button" className="brand-switcher__btn brand-switcher__reset" onClick={reset}>
              Reset
            </button>
            <span className="brand-switcher__hint">Canonical theme — matches the topbar theme picker.</span>
          </div>
        </SurfaceSection>

        <SurfaceSection title="Live demos">
          <motion.div
            key={theme}
            className="chameleon-stage glass-tile"
            variants={staggerChildren(0.07)}
            initial="hidden"
            animate="visible"
          >
            <SurfaceGrid columns={4} className="surface-grid--tiles">
              <motion.div variants={slideUp}>
                <DemoCard label="GlassCard · surface">
                  <BrandCard
                    title={THEME_LABELS[theme]}
                    body="The same card, re-skinned live by the canonical theme tokens. One component library."
                  />
                </DemoCard>
              </motion.div>
              <motion.div variants={slideUp}>
                <DemoCard label="Button · action">
                  <BrandButton>Mint LOVE</BrandButton>
                </DemoCard>
              </motion.div>
              <motion.div variants={slideUp}>
                <DemoCard label="Badge · status">
                  <BrandBadge>Verified</BrandBadge>
                </DemoCard>
              </motion.div>
              <motion.div variants={slideUp}>
                <DemoCard label="Metric · tile">
                  <BrandMetric value="128" label="LOVE minted" />
                </DemoCard>
              </motion.div>
            </SurfaceGrid>
          </motion.div>
        </SurfaceSection>

        <SurfaceSection title="Token delta">
          <motion.div className="brand-delta" variants={fadeIn} initial="hidden" animate="visible">
            <div className="brand-delta__panel">
              <div className="brand-delta__head">
                <h3 className="brand-delta__title">Token delta</h3>
                <span className="brand-delta__active">
                  {theme} → {THEME_LABELS[theme]}
                </span>
              </div>
              <div className="brand-delta__rows">
                {Object.keys(THEME_TOKENS[theme] ?? {}).slice(0, 5).map((key) => (
                  <div className="brand-delta__row" key={key}>
                    <span className="brand-delta__name">{key}</span>
                    <span className="brand-delta__value">{THEME_TOKENS[theme]?.[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </SurfaceSection>
      </SurfaceLayout>
    </section>
  );
}