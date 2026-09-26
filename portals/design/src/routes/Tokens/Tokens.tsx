import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  EDITABLE_TOKENS,
  exportCss,
  exportDtcg,
  exportJson,
  loadPersisted,
  persist,
  readToken,
  resetToken,
  writeToken,
  type TokenEdit,
} from '../../lib/tokenLab';
import { fadeIn, slideUp, staggerChildren, press, motionScale } from '../../lib/motionPresets';
import { SurfaceLayout, SurfaceHero, SurfaceSection, SurfaceGrid } from '../../lib/surface';
import '../../surfaces/tokens.css';

const isColor = (value: string): boolean => /(^|[\s(])oklch|color-mix/.test(value);

function download(filename: string, text: string, mime: string): void {
  if (typeof URL.createObjectURL !== 'function') return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** THE Token Lab — live OKLCH swatch editing, instant portal-wide recolor,
 *  standards export (CSS / JSON / DTCG). */
export default function Tokens() {
  const [edits, setEdits] = useState<TokenEdit[]>([]);
  const reduced = motionScale() < 0.5;

  useEffect(() => {
    loadPersisted();
    setEdits(
      EDITABLE_TOKENS.map((name) => ({
        name,
        original: readToken(name),
        current: readToken(name),
      })),
    );
  }, []);

  const change = (name: string, value: string) => {
    writeToken(name, value);
    setEdits((prev) => {
      const next = prev.map((e) => (e.name === name ? { ...e, current: value } : e));
      persist(next);
      return next;
    });
  };

  const reset = () => {
    for (const e of edits) resetToken(e.name);
    persist([]);
    setEdits((prev) => prev.map((e) => ({ ...e, current: e.original })));
  };

  const exportOne = (file: string, mime: string, body: string) => download(file, body, mime);

  const dirty = edits.filter((e) => e.current !== e.original).length;

  return (
    <section className="surface-panel active" data-mcp-tool="tokensSurface" data-mcp-state="ready">
      <SurfaceLayout>
        <SurfaceHero
          eyebrow="Live token lab · W3C DTCG"
          title="Design Tokens"
          lede="Edit any OKLCH token and the preview — plus every component on the page — recolors instantly. Export your deltas to CSS, JSON, or DTCG."
        />

        <SurfaceSection title="Export & reset">
          <div className="glass-tile">
            <div className="tlab-toolbar">
              <span className="tlab-toolbar__status">
                {dirty > 0 ? `${dirty} of ${edits.length} tokens edited · live` : 'all tokens pristine · live'}
              </span>
              <div className="tlab-actions">
                <motion.button
                  type="button"
                  className="btn tlab-export btn-sm"
                  variants={press}
                  initial="rest"
                  whileTap="pressed"
                  onClick={() => exportOne('p31-tokens.css', 'text/css', exportCss(edits))}
                >
                  Export CSS
                </motion.button>
                <motion.button
                  type="button"
                  className="btn tlab-export btn-sm"
                  variants={press}
                  initial="rest"
                  whileTap="pressed"
                  onClick={() => exportOne('p31-tokens.json', 'application/json', exportJson(edits))}
                >
                  Export JSON
                </motion.button>
                <motion.button
                  type="button"
                  className="btn tlab-export btn-sm"
                  variants={press}
                  initial="rest"
                  whileTap="pressed"
                  onClick={() => exportOne('p31-tokens.dtcg.json', 'application/json', exportDtcg(edits))}
                >
                  Export DTCG
                </motion.button>
                <motion.button
                  type="button"
                  className="btn btn-glass tlab-reset btn-sm"
                  variants={press}
                  initial="rest"
                  whileTap="pressed"
                  onClick={reset}
                >
                  Reset
                </motion.button>
              </div>
            </div>
          </div>
        </SurfaceSection>

        <SurfaceSection title="Token swatches">
          <div className="glass-tile">
            <SurfaceGrid columns={3}>
              <motion.div
                variants={staggerChildren(0.05)}
                initial={reduced ? false : 'hidden'}
                animate="visible"
                aria-label="Editable token swatches"
                style={{ display: 'contents' }}
              >
                {edits.map((e) => (
                  <motion.div key={e.name} variants={slideUp}>
                    <div
                      className="tlab-card"
                      data-mcp-tool={`tokenRow-${e.name.replace(/^--/, '').replace(/-/g, '')}`}
                      data-mcp-state="ready"
                    >
                      <div className="tlab-card__head">
                        <span className="mono tlab-card__name">{e.name}</span>
                        <span className="tlab-swatch" style={{ background: `var(${e.name})` }} aria-hidden="true" />
                      </div>
                      {isColor(e.current) ? (
                        <input
                          className="tlab-input"
                          value={e.current}
                          onChange={(ev) => change(e.name, ev.target.value)}
                          aria-label={`Edit ${e.name}`}
                          spellCheck={false}
                        />
                      ) : (
                        <span className="tlab-input tlab-input--static">{e.current || '—'}</span>
                      )}
                      <span className="tlab-card__meta mono">{e.current ? 'live' : 'unset'}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </SurfaceGrid>
          </div>
        </SurfaceSection>

        <SurfaceSection title="Live proof">
          <motion.div
            className="tlab-proof"
            data-mcp-tool="tokenProofStrip"
            data-mcp-state="ready"
            variants={fadeIn}
            initial={reduced ? false : 'hidden'}
            animate="visible"
          >
            <div className="tlab-proof__head">
              <h2 className="tlab-proof__title">Live proof</h2>
              <p className="tlab-proof__lede">Every tile re-renders from the current token values — no remount, pure CSS variables.</p>
            </div>
            <div className="tlab-proof__tiles">
              <div className="tlab-proof__tile tlab-proof__tile--bg">
                <span className="tlab-proof__label">--p31-bg</span>
                <span className="tlab-proof__value">bg</span>
                <span className="tlab-proof__sub">page canvas</span>
              </div>
              <div className="tlab-proof__tile tlab-proof__tile--surface">
                <span className="tlab-proof__label">--p31-surface</span>
                <span className="tlab-proof__value">surface</span>
                <span className="tlab-proof__sub">raised plane</span>
              </div>
              <div className="tlab-proof__tile tlab-proof__tile--accent">
                <span className="tlab-proof__label">--p31-accent</span>
                <span className="tlab-proof__bar" aria-hidden="true" />
                <span className="tlab-proof__sub">accent glow</span>
              </div>
              <div className="tlab-proof__tile">
                <span className="tlab-proof__label">--p31-glass-*</span>
                <span className="tlab-proof__value" style={{ fontSize: 'var(--p31-text-base)' }}>glass</span>
                <span className="tlab-proof__sub">blur + tint</span>
              </div>
              <div className="tlab-proof__bar-row">
                <span className="tlab-proof__badge">Live</span>
                <button type="button" className="btn btn-primary btn-sm">
                  Mint LOVE
                </button>
              </div>
            </div>
          </motion.div>
        </SurfaceSection>
      </SurfaceLayout>
    </section>
  );
}