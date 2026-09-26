import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { PageHeader } from '@p31ca/design-core/compositions';
import { useSpoonsStore } from '../../lib/useSpoonsStore';
import { press, slideUp, staggerChildren } from '../../lib/motionPresets';
import '../../surfaces/accessibility.css';

const SPOON_RANKS = [
  { n: 0, label: 'crisis', desc: 'Rest overlay, all motion off. The only chrome is the way out.' },
  { n: 1, label: 'minimal', desc: 'Glass turns opaque; the starfield dims to a whisper.' },
  { n: 2, label: 'quiet', desc: 'Slow motion factor, low-stimulation defaults.' },
  { n: 3, label: 'steady', desc: 'The default cadence — dynamic but calm.' },
  { n: 4, label: 'social', desc: 'Faster transitions, richer spacing.' },
  { n: 5, label: 'celebratory', desc: 'Full energy — LOVE rewards, glow, and motion flourish.' },
];

const KEYBOARD_TABLES = [
  {
    name: 'Button',
    note: 'role="button" is implicit; toggle buttons add aria-pressed.',
    rows: [
      { key: 'Enter / Space', action: 'Activate the button — fires onClick.', aria: 'aria-disabled when disabled; aria-pressed reflects toggle state.' },
      { key: 'Tab / Shift+Tab', action: 'Move focus in and out of the control.', aria: 'Visible :focus-visible ring marks focus.' },
    ],
  },
  {
    name: 'Card',
    note: 'Only interactive cards take keyboard focus — give them role="button" or a link.',
    rows: [
      { key: 'Enter / Space', action: 'Activate the interactive card.', aria: 'role="button" or "link"; aria-disabled while inactive.' },
      { key: 'Tab', action: 'Focus the card as a single stop.', aria: ':focus-visible ring communicates the card is focusable.' },
      { key: 'Arrow keys', action: 'Move between cards in a grid via roving tabindex.', aria: 'aria-selected when the card behaves as a tab.' },
    ],
  },
  {
    name: 'Dialog',
    note: 'Modal, titled, and focus-managed from open to close.',
    rows: [
      { key: 'Escape', action: 'Close the dialog.', aria: 'role="dialog"; aria-modal="true"; aria-labelledby points at the title.' },
      { key: 'Tab / Shift+Tab', action: 'Cycle focus inside the trap; Shift reverses direction.', aria: 'Background content is inert while the dialog is open.' },
      { key: 'Open / close', action: 'Focus moves into the dialog on open and returns to the trigger on close.', aria: 'aria-describedby links the descriptive body copy.' },
    ],
  },
  {
    name: 'Select',
    note: 'Native select keeps the platform keyboard behavior.',
    rows: [
      { key: 'ArrowUp / ArrowDown', action: 'Open the listbox and move through options.', aria: 'role="combobox" + "listbox"; aria-expanded on the trigger.' },
      { key: 'Home / End', action: 'Jump to the first / last option.', aria: 'aria-activedescendant names the highlighted option.' },
      { key: 'Enter', action: 'Commit the highlighted option.', aria: 'aria-selected marks the active option.' },
      { key: 'Escape', action: 'Close the listbox and restore focus to the trigger.', aria: 'aria-expanded="false" on close.' },
    ],
  },
];

const ARIA_PATTERNS = [
  {
    title: 'Labels',
    desc: 'Every control needs an accessible name — visible text first, then aria-label or aria-labelledby.',
    code: '<button aria-label="Close dialog">✕</button>\n<label htmlFor="tier">Tier</label>\n<section aria-labelledby="h-id">…</section>',
  },
  {
    title: 'Live regions',
    desc: 'aria-live="polite" announces async updates without stealing focus; role="status" / "alert" raise the priority.',
    code: '<div aria-live="polite" role="status">\n  Saved just now\n</div>\n<div role="alert">Sync failed — retry</div>',
  },
  {
    title: 'Focus',
    desc: 'Visible :focus-visible rings, a trap inside dialogs, focus return on close, and a skip link for keyboard users.',
    code: ':focus-visible { outline: 2px solid var(--p31-accent); }\n<Dialog onClose={restoreFocus} />\n<a href="#main" className="skip-link">Skip</a>',
  },
];

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;
    if (!mq) return;
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduce;
}

function motionScaleFor(spoons: number): number {
  return spoons >= 4 ? 1 : spoons === 3 ? 0.6 : spoons >= 1 ? 0.2 : 0;
}

export default function Accessibility() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const reduceMotion = usePrefersReducedMotion();
  const rank = SPOON_RANKS[spoons];

  return (
    <div className="a11y-page" data-mcp-tool="accessibilitySurface" data-mcp-state="ready">
      <PageHeader
        eyebrow="Neuroinclusion"
        title="Accessibility"
        lede="The spoon ladder, keyboard interaction tables, ARIA patterns, and the reduced-motion floor — the priority order that shapes every P31 surface."
      />

      <motion.div className="a11y-stack" initial="hidden" animate="visible" variants={staggerChildren(0.08)}>
        <motion.section className="a11y-tile" variants={slideUp} aria-labelledby="a11y-spoons-title">
          <div className="a11y-tile__head">
            <span className="a11y-eyebrow">Primitive</span>
            <h2 id="a11y-spoons-title" className="a11y-tile__title">Spoon ladder</h2>
            <span className="a11y-chip">{rank.n}/5 · {rank.label}</span>
          </div>
          <p className="a11y-tile__desc">
            Each rung sets <code>data-spoons</code> on <code>documentElement</code> — the suite maps it to{' '}
            <code>--motion-scale</code> live. Rung 0 is the calm floor: no motion, no blur.
          </p>
          <div className="a11y-ladder" role="radiogroup" aria-label="Cognitive load">
            {SPOON_RANKS.map((s) => (
              <motion.button
                key={s.n}
                type="button"
                role="radio"
                aria-checked={spoons === s.n}
                initial="rest"
                whileTap="pressed"
                variants={press}
                className={`a11y-ladder__btn${spoons === s.n ? ' is-active' : ''}`}
                onClick={() => setSpoons(s.n)}
              >
                <span className="a11y-ladder__num">{s.n}</span>
                <span className="a11y-ladder__label">{s.label}</span>
              </motion.button>
            ))}
          </div>
          <div className="a11y-ladder__bar" aria-hidden="true">
            {SPOON_RANKS.map((s) => (
              <i key={s.n} className={spoons >= s.n ? 'on' : ''} />
            ))}
          </div>
          <p className="a11y-ladder__readout">level {rank.n} — {rank.desc}</p>
        </motion.section>

        <motion.section className="a11y-tile" variants={slideUp} aria-labelledby="a11y-kbd-title">
          <div className="a11y-tile__head">
            <span className="a11y-eyebrow">Keyboard & ARIA</span>
            <h2 id="a11y-kbd-title" className="a11y-tile__title">Interaction tables</h2>
          </div>
          <p className="a11y-tile__desc">
            Four canon components, their keys, the action they trigger, and the ARIA contract they honor.
          </p>
          <div className="a11y-grid">
            {KEYBOARD_TABLES.map((t) => (
              <div key={t.name} className="a11y-kcard">
                <div className="a11y-kcard__name">{t.name}</div>
                <p className="a11y-kcard__note">{t.note}</p>
                <table className="a11y-ktable">
                  <thead>
                    <tr>
                      <th scope="col">Key</th>
                      <th scope="col">Action</th>
                      <th scope="col">ARIA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((r) => (
                      <tr key={r.key}>
                        <td>{r.key}</td>
                        <td>{r.action}</td>
                        <td>{r.aria}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section className="a11y-tile" variants={slideUp} aria-labelledby="a11y-patterns-title">
          <div className="a11y-tile__head">
            <span className="a11y-eyebrow">ARIA</span>
            <h2 id="a11y-patterns-title" className="a11y-tile__title">Patterns</h2>
          </div>
          <div className="a11y-patterns">
            {ARIA_PATTERNS.map((p) => (
              <div key={p.title} className="a11y-pattern">
                <h3 className="a11y-pattern__title">{p.title}</h3>
                <p className="a11y-pattern__desc">{p.desc}</p>
                <pre className="a11y-pattern__code">{p.code}</pre>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section className="a11y-tile" variants={slideUp} aria-labelledby="a11y-motion-title">
          <div className="a11y-tile__head">
            <span className="a11y-eyebrow">Motion</span>
            <h2 id="a11y-motion-title" className="a11y-tile__title">Reduced motion</h2>
            <span className={`a11y-status ${reduceMotion ? 'a11y-status--on' : 'a11y-status--off'}`}>
              {reduceMotion ? 'Reduced motion on' : 'Full motion'}
            </span>
          </div>
          <p className="a11y-tile__desc">
            The suite honors <code>prefers-reduced-motion</code> twice: the media query drives{' '}
            <code>--motion-scale</code> toward zero, and the spoon ladder drives it live through{' '}
            <code>data-spoons</code> on <code>documentElement</code>. Motion animates transform + opacity
            only, so a zero scale is a calm, still floor — not a jarring cut.
          </p>
          <div className="a11y-motion-note">
            --motion-scale: {reduceMotion ? '0.1 (prefers-reduced-motion)' : motionScaleFor(spoons)}
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}