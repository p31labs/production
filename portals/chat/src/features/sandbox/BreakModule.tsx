import { useEffect, useRef, useState } from 'react';
import { Button } from '@p31ca/design-core/compositions';
import { useSandboxStore } from './sandboxStore';

type PacerPhase = 'inhale' | 'hold' | 'exhale';

const PACER_PHASES: PacerPhase[] = ['inhale', 'hold', 'exhale'];
const PHASE_LABEL: Record<PacerPhase, string> = {
  inhale: 'Breathe in',
  hold: 'Hold',
  exhale: 'Breathe out',
};
const PHASE_MS = 4000;

const GROUNDING_PROMPTS = [
  'Name five things you can see',
  'Feel your feet on the floor',
  'Slow your breath to a count of four',
];

export default function BreakModule() {
  const breakOpen = useSandboxStore((s) => s.breakOpen);
  const setBreakOpen = useSandboxStore((s) => s.setBreakOpen);

  const [phase, setPhase] = useState<PacerPhase>('inhale');
  const [reducedMotion, setReducedMotion] = useState(false);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    if (!breakOpen) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const raf = requestAnimationFrame(() => document.getElementById('break-module-close')?.focus());
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setBreakOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocusedRef.current?.focus();
      previouslyFocusedRef.current = null;
    };
  }, [breakOpen, setBreakOpen]);

  useEffect(() => {
    if (!breakOpen || reducedMotion) return;
    setPhase('inhale');
    const id = setInterval(() => {
      setPhase((p) => PACER_PHASES[(PACER_PHASES.indexOf(p) + 1) % PACER_PHASES.length]);
    }, PHASE_MS);
    return () => clearInterval(id);
  }, [breakOpen, reducedMotion]);

  if (!breakOpen) return null;

  const openCrisis = () => {
    setBreakOpen(false);
    window.dispatchEvent(new CustomEvent('p31:crisis'));
  };

  return (
    <div
      className="break-module"
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-module-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) setBreakOpen(false);
      }}
    >
      <div className="break-module__panel">
        <h2 className="break-module__title" id="break-module-title">
          Take a break
        </h2>

        <div
          className={`break-module__pacer${!reducedMotion ? ` break-module__pacer--${phase}` : ''}`}
          aria-live="polite"
        >
          {reducedMotion ? 'Breathe slowly' : PHASE_LABEL[phase]}
        </div>

        <p className="break-module__guide">
          A quiet minute. There's no rush — we'll keep your place here.
        </p>

        <ul className="break-module__prompts">
          {GROUNDING_PROMPTS.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>

        <button
          type="button"
          className="break-module__crisis"
          aria-label="Close break and open crisis support"
          onClick={openCrisis}
        >
          If you're in crisis, tap here
        </button>

        <div className="break-module__actions">
          <Button variant="primary" size="sm" id="break-module-close" onClick={() => setBreakOpen(false)}>
            I'm ready
          </Button>
        </div>
      </div>
    </div>
  );
}