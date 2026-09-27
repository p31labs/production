import { useState } from 'react';
import { GlassPanel } from '@p31ca/design-core/compositions';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid } from '../../lib/surface';
import P31Icon, { type IconName } from '../../components/P31Icon';
import { motion } from 'motion/react';
import { useSessionStore } from '../../lib/useSessionStore';
import { slideUp, staggerChildren } from '../../lib/motionPresets';
import '../../surfaces/icons.css';

const CURATED: IconName[] = [
  'spoon',
  'molecule',
  'love-heart',
  'k4-tetrahedron',
  'signal',
  'mesh-node',
  '863hz-resonance',
  'p31-wordmark',
  'comet-orb',
  'nebula-burst',
  'prism-fold',
  'sovereign-crown',
];

const VARIANTS = [
  { id: 'animated', label: 'Animated' },
  { id: 'glow', label: 'Glow' },
  { id: 'pulse', label: 'Pulse' },
] as const;
type Variant = (typeof VARIANTS)[number]['id'];

function Glyph({ name, size }: { name: IconName; size: number }) {
  return (
    <span className="icon-glyph" aria-hidden="true">
      <P31Icon name={name} size={size} />
    </span>
  );
}

/** Icons — live browser over the real P31 animated icon pack (theme-adaptive). */
export default function Icons() {
  const [variant, setVariant] = useState<Variant>('animated');
  const [size, setSize] = useState(48);
  const [toast, setToast] = useState<string | null>(null);

  const copy = (name: IconName) => {
    const snippet = `<P31Icon name="${name}" size={48} />`;
    navigator.clipboard?.writeText(snippet);
    useSessionStore.getState().countCopy();
    setToast(snippet);
    window.setTimeout(() => setToast(null), 1600);
  };

  return (
    <section className="surface-panel active" data-mcp-tool="iconsSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Icon system"
          title="Icons"
          lede="The real P31 animated icon pack — 12 theme-adaptive SVGs (self-animated, colorized via --p31-accent-*), live-size, copy-ready."
        />

        <SurfaceSection title="Controls">
          <GlassPanel strong className="icon-controls">
            <div className="meta-row">
              <span className="label-tiny" style={{ margin: 0 }}>Variant</span>
              {VARIANTS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  className={`chip ${variant === v.id ? 'active' : ''}`}
                  onClick={() => setVariant(v.id)}
                  aria-pressed={variant === v.id}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className="icon-size-row">
              <label htmlFor="icon-size">Size</label>
              <input
                id="icon-size"
                className="icon-range"
                type="range"
                min={16}
                max={64}
                step={2}
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                aria-label="Icon size"
              />
              <span className="icon-size-val">{size}px</span>
            </div>
          </GlassPanel>
        </SurfaceSection>

        <SurfaceSection title="Glyphs">
          <motion.div className={`icon-grid icon-grid--${variant} glass-tile`} variants={staggerChildren(0.04)} initial="hidden" animate="visible">
            <SurfaceGrid columns={6} className="surface-grid--tiles">
              {CURATED.map((name) => (
                <motion.div
                  key={name}
                  className="icon-tile"
                  data-variant={variant}
                  variants={slideUp}
                >
                  <div className="icon-tile__stage">
                    <Glyph name={name} size={size} />
                  </div>
                  <div className="icon-tile__foot">
                    <span className="icon-tile__name">{name}</span>
                    <button
                      type="button"
                      className="icon-tile__copy"
                      onClick={() => copy(name)}
                      aria-label={`Copy ${name} icon snippet`}
                    >
                      copy
                    </button>
                  </div>
                </motion.div>
              ))}
            </SurfaceGrid>
          </motion.div>
        </SurfaceSection>

        <SurfaceSection title="Import">
          <div className="glass-panel">
            <pre className="code-line">{'import P31Icon, { type IconName } from "../icons/P31Icon"'}</pre>
            <pre className="code-line">{'<P31Icon name="sparkles" size={16} />  // inherits color via currentColor'}</pre>
            <pre className="code-line">{'// Variants: inline (fill) · stroked (stroke) · glow (accent drop-shadow)'}</pre>
          </div>
        </SurfaceSection>
      </SurfaceLayout>

      {toast && <div className="portal-toast" role="status">Copied {toast}</div>}
    </section>
  );
}