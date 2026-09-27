import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useSessionStore } from '../lib/useSessionStore';
import { useSpoonsStore } from '../lib/useSpoonsStore';

interface Props {
  onClose: () => void;
}

const fmtDur = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m ${s % 60}s`;
};

/**
 * SessionSummary — the ethical-gamification layer (WP-2026-09-27f).
 * A slide-over from the right (not a modal — no interruption) showing REAL
 * session counters. Explicit-trigger only; Escape / scrim / Continue close it.
 * Radiant Patterns: competence ("what you did") + relatedness, never pressure.
 * Motion respects --motion-scale (spoons 0 → static panel, calm floor).
 */
export function SessionSummary({ onClose }: Props) {
  const routes = useSessionStore((s) => s.routes);
  const tokenEdits = useSessionStore((s) => s.tokenEdits);
  const copies = useSessionStore((s) => s.copies);
  const calmPresses = useSessionStore((s) => s.calmPresses);
  const peakSpoons = useSessionStore((s) => s.peakSpoons);
  const startedAt = useSessionStore((s) => s.startedAt);
  const dismiss = useSessionStore((s) => s.dismiss);
  const end = useSessionStore((s) => s.end);
  const spoons = useSpoonsStore((s) => s.spoons);

  const scale = spoons >= 4 ? 1 : spoons === 3 ? 0.6 : spoons >= 1 ? 0.2 : 0;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const close = () => {
    dismiss();
    onClose();
  };

  const finish = () => {
    end();
    onClose();
  };

  return (
    <div className="session-summary" role="dialog" aria-modal="false" aria-label="Session summary">
      <button type="button" className="session-summary__scrim" onClick={close} aria-label="Close session summary" tabIndex={-1} />
      <motion.aside
        className="session-summary__panel glass-tile"
        initial={{ x: '110%' }}
        animate={{ x: 0 }}
        exit={{ x: '110%' }}
        transition={{ duration: 0.32 * Math.max(scale, 0.05), ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="session-summary__head">
          <h2 className="session-summary__title">Session</h2>
          <span className="session-summary__clock">{fmtDur(now - startedAt)}</span>
        </div>

        <p className="session-summary__intro">What you explored this session — no goals, just the record.</p>

        <dl className="session-summary__stats">
          <div className="session-summary__stat">
            <dt>Surfaces explored</dt>
            <dd>{routes.length}</dd>
          </div>
          <div className="session-summary__stat">
            <dt>Tokens edited</dt>
            <dd>{tokenEdits}</dd>
          </div>
          <div className="session-summary__stat">
            <dt>Snippets copied</dt>
            <dd>{copies}</dd>
          </div>
          <div className="session-summary__stat">
            <dt>Peak energy</dt>
            <dd>◈ {peakSpoons}{calmPresses > 0 ? ` · calm ${calmPresses}×` : ''}</dd>
          </div>
        </dl>

        <div className="session-summary__actions">
          <button type="button" className="btn btn-glass" onClick={close}>Continue session</button>
          <button type="button" className="btn" onClick={finish}>End session</button>
        </div>
      </motion.aside>
    </div>
  );
}