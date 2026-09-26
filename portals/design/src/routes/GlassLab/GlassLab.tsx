import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { GlassPanel } from '@p31ca/design-core/compositions';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid } from '../../lib/surface';
import { LiveExample } from '../../lib/livePreview';
import { readToken, resetToken, writeToken } from '../../lib/tokenLab';
import { fadeIn, slideUp, staggerChildren, press, motionScale } from '../../lib/motionPresets';
import '../../surfaces/glasslab.css';

const GLASS_TOKENS = ['--p31-glass-bg', '--p31-glass-border', '--p31-glass-blur'] as const;
type GlassToken = (typeof GLASS_TOKENS)[number];

const GLASS_TILE_CODE = `<GlassPanel strong className="glab-tile">
  <span className="glab-tile__label">glass-card</span>
  <span className="glab-tile__title">Quantum tile</span>
  <span className="glab-tile__sub">backdrop-filter var(--p31-glass-blur)</span>
</GlassPanel>

<span className="glab-badge">
  <span className="glab-badge__dot" /> Live glass
</span>

<input className="glab-input" placeholder="Glass input — live tokens" />`;

/** GlassLab — glass composition laboratory. The hero panel is bound to live
 *  glass tokens: edit --p31-glass-bg / -border / -blur via writeToken() and
 *  the hero, the tiles, and the token strip all stream live. */
export default function GlassLab() {
  const [values, setValues] = useState<Record<GlassToken, string>>({
    '--p31-glass-bg': '',
    '--p31-glass-border': '',
    '--p31-glass-blur': '',
  });
  const reduced = motionScale() < 0.5;

  useEffect(() => {
    const init = {} as Record<GlassToken, string>;
    for (const t of GLASS_TOKENS) init[t] = readToken(t);
    setValues(init);
  }, []);

  const setGlass = (name: GlassToken, value: string) => {
    writeToken(name, value);
    setValues((v) => ({ ...v, [name]: value }));
  };

  const reset = () => {
    for (const t of GLASS_TOKENS) resetToken(t);
    const next = {} as Record<GlassToken, string>;
    for (const t of GLASS_TOKENS) next[t] = readToken(t);
    setValues(next);
  };

  return (
    <section className="surface-panel active" data-mcp-tool="glassLabSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Glassmorphism 2.0"
          title="Glass Lab"
          lede="Compose live glass: edit the background tint, border, and blur tokens — the hero panel, tiles, and token strip all re-render instantly."
        />

        <SurfaceSection title="Composition">
          <GlassPanel strong padding="lg" className="glab-hero">
            <div className="glab-hero__grid">
              <div>
                <span className="label-tiny">Hero glass</span>
                <h2 className="glab-hero__title">Live glass composition</h2>
                <p className="glab-hero__lede">
                  This panel reads <span className="mono">var(--p31-glass-bg)</span>,{' '}
                  <span className="mono">var(--p31-glass-border)</span>, and{' '}
                  <span className="mono">var(--p31-glass-blur)</span>. Edit a token and the
                  composition streams live — backdrop blur, tint, and edge all move together.
                </p>
                <div className="glab-hero__actions">
                  <motion.button
                    type="button"
                    className="btn btn-glass glab-reset btn-sm"
                    variants={press}
                    initial="rest"
                    whileTap="pressed"
                    onClick={reset}
                  >
                    Reset glass
                  </motion.button>
                </div>
              </div>

              <motion.div
                className="glab-controls"
                variants={staggerChildren(0.06)}
                initial={reduced ? false : 'hidden'}
                animate="visible"
              >
                {GLASS_TOKENS.map((t) => (
                  <motion.div key={t} variants={slideUp} className="glab-control">
                    <span className="mono glab-control__name">{t}</span>
                    <input
                      className="glab-control__input"
                      value={values[t] ?? ''}
                      onChange={(ev) => setGlass(t, ev.target.value)}
                      aria-label={`Edit ${t}`}
                      spellCheck={false}
                    />
                    {t === '--p31-glass-blur' ? (
                      <span className="glab-swatch glab-swatch--blur" aria-hidden="true" />
                    ) : (
                      <span className="glab-swatch" style={{ background: `var(${t})` }} aria-hidden="true" />
                    )}
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </GlassPanel>

          <motion.div
            className="glab-strip"
            data-mcp-tool="glassTokenStrip"
            data-mcp-state="ready"
            variants={fadeIn}
            initial={reduced ? false : 'hidden'}
            animate="visible"
          >
            {GLASS_TOKENS.map((t) => (
              <span key={t} className="mono glab-strip__chip">
                <span
                  className="glab-strip__dot"
                  style={{
                    background:
                      t === '--p31-glass-blur'
                        ? 'var(--p31-accent)'
                        : `var(${t})`,
                  }}
                  aria-hidden="true"
                />
                {t} · {values[t] || '—'}
              </span>
            ))}
          </motion.div>
        </SurfaceSection>

        <SurfaceSection title="Glass tiles">
          <motion.div className="glass-tile" variants={slideUp} initial={reduced ? false : 'hidden'} animate="visible">
            <LiveExample
              title="Glass tiles"
              description="A card, a badge, and an input composed on the live glass tokens — recolors as the lab edits."
              render={() => (
                <SurfaceGrid columns={3}>
                  <GlassPanel strong className="glab-tile">
                    <span className="glab-tile__label mono">glass-card</span>
                    <span className="glab-tile__title">Quantum tile</span>
                    <span className="glab-tile__sub">backdrop-filter var(--p31-glass-blur)</span>
                  </GlassPanel>
                  <span className="glab-badge">
                    <span className="glab-badge__dot" aria-hidden="true" />
                    Live glass
                  </span>
                  <input className="glab-input" placeholder="Glass input — live tokens" aria-label="Glass input demo" />
                </SurfaceGrid>
              )}
              code={GLASS_TILE_CODE}
            />
          </motion.div>
        </SurfaceSection>
      </SurfaceLayout>
    </section>
  );
}