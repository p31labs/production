import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid } from '../../lib/surface';
import { readToken, writeToken } from '../../lib/tokenLab';
import { fadeIn, slideUp, staggerChildren } from '../../lib/motionPresets';
import '../../surfaces/brands.css';

const TOKEN_KEYS = [
  '--p31-accent',
  '--p31-accent-gold',
  '--p31-accent-cyan',
  '--p31-bg',
  '--p31-surface',
] as const;

type TokenKey = (typeof TOKEN_KEYS)[number];

interface BrandPalette {
  id: string;
  name: string;
  note: string;
  accent: string;
  tokens: Record<TokenKey, string>;
}

/**
 * CHAMELEON — four brand palettes defined as pure OKLCH token deltas.
 * Applying a brand calls writeToken() for every key so the whole portal
 * (and each demo component below) recolors live. One component library,
 * N brands, zero forks.
 */
const BRANDS: BrandPalette[] = [
  {
    id: 'quantum',
    name: 'Quantum Cyan',
    note: 'Default resonance — cold cyan over the hue-240 void.',
    accent: 'oklch(0.78 0.18 195)',
    tokens: {
      '--p31-accent': 'oklch(0.78 0.18 195)',
      '--p31-accent-gold': 'oklch(0.82 0.16 85)',
      '--p31-accent-cyan': 'oklch(0.78 0.18 195)',
      '--p31-bg': 'oklch(0.1 0.008 240)',
      '--p31-surface': 'oklch(0.14 0.012 240)',
    },
  },
  {
    id: 'solar',
    name: 'Solar Gold',
    note: 'Sunflower glow — warm gold over a dusk canvas.',
    accent: 'oklch(0.8 0.16 80)',
    tokens: {
      '--p31-accent': 'oklch(0.8 0.16 80)',
      '--p31-accent-gold': 'oklch(0.8 0.16 80)',
      '--p31-accent-cyan': 'oklch(0.76 0.15 95)',
      '--p31-bg': 'oklch(0.1 0.012 70)',
      '--p31-surface': 'oklch(0.14 0.016 70)',
    },
  },
  {
    id: 'iris',
    name: 'Iris Violet',
    note: 'Deep violet — night-iris over the hue-275 nebula.',
    accent: 'oklch(0.7 0.17 285)',
    tokens: {
      '--p31-accent': 'oklch(0.7 0.17 285)',
      '--p31-accent-gold': 'oklch(0.78 0.15 60)',
      '--p31-accent-cyan': 'oklch(0.72 0.16 265)',
      '--p31-bg': 'oklch(0.09 0.012 275)',
      '--p31-surface': 'oklch(0.13 0.016 275)',
    },
  },
  {
    id: 'moss',
    name: 'Moss Green',
    note: 'Soft earth — green calm for long focus sessions.',
    accent: 'oklch(0.72 0.14 155)',
    tokens: {
      '--p31-accent': 'oklch(0.72 0.14 155)',
      '--p31-accent-gold': 'oklch(0.76 0.14 95)',
      '--p31-accent-cyan': 'oklch(0.7 0.13 175)',
      '--p31-bg': 'oklch(0.1 0.012 150)',
      '--p31-surface': 'oklch(0.14 0.016 150)',
    },
  },
];

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

/** CHAMELEON — one component library, N brand palettes, no fork. */
export default function Brands() {
  const [active, setActive] = useState<BrandPalette>(BRANDS[0]);
  const originals = useRef<Record<string, string>>({});

  useEffect(() => {
    for (const key of TOKEN_KEYS) originals.current[key] = readToken(key);
    const tokens = BRANDS[0].tokens;
    for (const [key, value] of Object.entries(tokens)) writeToken(key, value);
  }, []);

  useEffect(() => {
    const captured = originals.current;
    return () => {
      for (const key of TOKEN_KEYS) {
        const orig = captured[key];
        if (orig) writeToken(key, orig);
        else document.documentElement.style.removeProperty(key);
      }
    };
  }, []);

  const applyBrand = (brand: BrandPalette) => {
    for (const [key, value] of Object.entries(brand.tokens)) writeToken(key, value);
    setActive(brand);
  };

  const reset = () => {
    for (const key of TOKEN_KEYS) {
      const orig = originals.current[key];
      if (orig) writeToken(key, orig);
      else document.documentElement.style.removeProperty(key);
    }
    setActive(BRANDS[0]);
  };

  return (
    <section className="surface-panel active" data-mcp-tool="brandsSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Chameleon · multi-brand"
          title="Brands"
          lede="One component library, N brand palettes, zero forks. Switching hot-applies OKLCH token deltas via writeToken — every demo below recolors live."
        />

        <SurfaceSection title="Brand switcher">
          <div className="brand-switcher glass-tile">
            {BRANDS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={`brand-switcher__btn ${active.id === b.id ? 'brand-switcher__btn--active' : ''}`}
                onClick={() => applyBrand(b)}
                aria-pressed={active.id === b.id}
              >
                <span className="brand-switcher__swatch" style={{ background: b.accent }} aria-hidden="true" />
                {b.name}
              </button>
            ))}
            <button type="button" className="brand-switcher__btn brand-switcher__reset" onClick={reset}>
              Reset
            </button>
            <span className="brand-switcher__hint">{active.note}</span>
          </div>
        </SurfaceSection>

        <SurfaceSection title="Live demos">
          <motion.div
            key={active.id}
            className="chameleon-stage glass-tile"
            variants={staggerChildren(0.07)}
            initial="hidden"
            animate="visible"
          >
            <SurfaceGrid columns={4} className="surface-grid--tiles">
              <motion.div variants={slideUp}>
                <DemoCard label="GlassCard · surface">
                  <BrandCard
                    title={active.name}
                    body="The same card, re-skinned live by the active brand tokens. One component library."
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
                  {active.id} → {active.name}
                </span>
              </div>
              <div className="brand-delta__rows">
                {TOKEN_KEYS.map((key) => (
                  <div className="brand-delta__row" key={key}>
                    <span className="brand-delta__name">{key}</span>
                    <span className="brand-delta__value">{active.tokens[key]}</span>
                    <span className="brand-delta__orig">{originals.current[key] || '—'}</span>
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