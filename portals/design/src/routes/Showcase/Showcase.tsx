import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { NAV_SECTIONS } from '../../lib/nav';
import { useSpoonsStore } from '../../lib/useSpoonsStore';
import { MCP_TOOLS } from '../../lib/mcpTools';
import { fadeIn, slideUp, staggerChildren, press, layoutShift, motionScale } from '../../lib/motionPresets';
import { SurfaceLayout, SurfaceHero, SurfaceSection } from '../../lib/surface';
import '../../surfaces/showcase.css';

interface MotionDemo {
  id: string;
  label: string;
  caption: string;
  render: (tick: number, reduced: boolean) => ReactNode;
}

const MOTION_DEMOS: MotionDemo[] = [
  {
    id: 'spring',
    label: 'Spring',
    caption: 'stiffness 220 · damping 26',
    render: (tick, reduced) => (
      <motion.div
        key={`spring-${tick}`}
        className="motion-orb"
        initial={reduced ? false : { scale: 0.2, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26, mass: 0.9 }}
        aria-hidden="true"
      />
    ),
  },
  {
    id: 'stagger',
    label: 'Stagger',
    caption: 'staggerChildren · 80ms',
    render: (tick, reduced) => (
      <motion.div
        key={`stagger-${tick}`}
        className="motion-stagger"
        variants={staggerChildren(0.08)}
        initial={reduced ? false : 'hidden'}
        animate="visible"
        aria-hidden="true"
      >
        {['Spoons', 'Tokens', 'LOVE', 'Mesh'].map((s) => (
          <motion.span key={s} className="motion-chip" variants={slideUp}>{s}</motion.span>
        ))}
      </motion.div>
    ),
  },
  {
    id: 'layout-shift',
    label: 'Layout shift',
    caption: 'motion layout · smooth spring',
    render: (tick, reduced) => <LayoutShiftDemo key={`layout-${tick}`} reduced={reduced} />,
  },
  {
    id: 'micro-press',
    label: 'Micro-press',
    caption: 'press scale 1 → 0.97',
    render: (tick, _reduced) => (
      <motion.button
        key={`press-${tick}`}
        type="button"
        className="btn btn-primary motion-press"
        variants={press}
        initial="rest"
        whileHover="pressed"
        whileTap="pressed"
      >
        Press me
      </motion.button>
    ),
  },
  {
    id: 'fade',
    label: 'Fade',
    caption: 'opacity only · 0.3s',
    render: (tick, reduced) => (
      <motion.p
        key={`fade-${tick}`}
        className="motion-text"
        variants={fadeIn}
        initial={reduced ? false : 'hidden'}
        animate="visible"
      >
        Fade — transform-free opacity
      </motion.p>
    ),
  },
  {
    id: 'slide',
    label: 'Slide',
    caption: 'slide-up · 12px spring',
    render: (tick, reduced) => (
      <motion.div
        key={`slide-${tick}`}
        className="motion-glass-card"
        variants={slideUp}
        initial={reduced ? false : 'hidden'}
        animate="visible"
      >
        <span className="motion-tile__label">Slide up</span>
      </motion.div>
    ),
  },
];

function LayoutShiftDemo({ reduced }: { reduced: boolean }) {
  const [open, setOpen] = useState(false);
  const settle = reduced ? { duration: 0 } : layoutShift;
  return (
    <motion.div layout className="motion-layout" transition={settle}>
      <button type="button" className="btn btn-glass btn-sm" onClick={() => setOpen((o) => !o)}>
        {open ? 'Collapse' : 'Expand'}
      </button>
      {open && (
        <motion.div
          layout
          className="motion-layout__block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={settle}
          aria-hidden="true"
        />
      )}
    </motion.div>
  );
}

function MotionTile({ demo, reduced }: { demo: MotionDemo; reduced: boolean }) {
  const [tick, setTick] = useState(0);
  return (
    <div className="motion-tile" data-motion-demo={demo.id}>
      <div className="motion-tile__stage">{demo.render(tick, reduced)}</div>
      <div className="motion-tile__foot">
        <span className="motion-tile__label">{demo.label}</span>
        <button type="button" className="btn btn-glass btn-sm" onClick={() => setTick((t) => t + 1)}>
          Replay
        </button>
      </div>
    </div>
  );
}

/** Showcase — the Quantum Material home launcher (prototype parity). */
export default function Showcase() {
  const navigate = useNavigate();
  const spoons = useSpoonsStore((s) => s.spoons);

  const go = (path: string) => navigate(path);

  /** --motion-scale is 0 at spoons=0 and 0.1 under prefers-reduced-motion. */
  const reduced = motionScale() < 0.5;

  return (
    <section className="surface-panel active" data-mcp-tool="showcaseSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="P31 · Sovereign Stack"
          title="P31 Design System"
          lede="The Quantum Material design language — OKLCH tokens, glass compositions, and the agent-native canon."
          actions={
            <div className="family-strip">
              <div className="family-avatars">
                <div className="family-avatar" style={{ background: 'var(--p31-accent-cyan)' }}>OK</div>
                <div className="family-avatar" style={{ background: 'var(--p31-accent-violet)' }}>QM</div>
                <div className="family-avatar" style={{ background: 'var(--p31-accent-gold)' }}>3.0</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--p31-cloud)' }}>DESIGN CANON</div>
                <div className="love-chip">♥ {spoons === 0 ? 'resting' : 'Quantum Material'}</div>
              </div>
            </div>
          }
        />

        <SurfaceSection>
          <div className="launcher-grid">
            {NAV_SECTIONS.map((s) => (
              <button
                key={s.path}
                type="button"
                className="launcher-card"
                data-mcp-tool={MCP_TOOLS[s.path.replace('/', '')] ?? s.path.replace('/', '')}
                data-mcp-state="ready"
                onClick={() => go(s.path)}
                aria-label={`Open ${s.label}`}
              >
                <div className="surface-card-header">
                  <div
                    className="surface-card-icon"
                    style={{
                      background: s.flagship ? 'color-mix(in oklch, var(--p31-accent-cyan) 15%, transparent)' : 'color-mix(in oklch, var(--p31-accent-violet) 15%, transparent)',
                      color: s.flagship ? 'var(--p31-accent-cyan)' : 'var(--p31-accent-violet)',
                    }}
                  >
                    {s.emoji}
                  </div>
                  <span className="badge badge-spark">{s.flagship ? 'FLAGSHIP' : 'SUPPORT'}</span>
                </div>
                <h3 className="surface-card-title">{s.label}</h3>
                <p className="surface-card-desc">{s.description}</p>
              </button>
            ))}
          </div>
        </SurfaceSection>

        <SurfaceSection>
          <div className="motion-strip glass-tile" data-mcp-tool="motionStrip" data-mcp-state="ready">
            <div className="motion-strip__head">
              <h2>Motion principles</h2>
              <p>Six micro-demos on real glass — every transition respects <span className="mono">--motion-scale</span> (spoons + reduced-motion).</p>
            </div>
            <div className="motion-strip__grid" aria-label="Motion principle demos">
              {MOTION_DEMOS.map((d) => (
                <MotionTile key={d.id} demo={d} reduced={reduced} />
              ))}
            </div>
          </div>
        </SurfaceSection>
      </SurfaceLayout>
    </section>
  );
}