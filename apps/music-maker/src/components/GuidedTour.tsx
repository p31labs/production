/**
 * The music maker — GuidedTour.
 *
 * Four teaching cards, shown one at a time, anchored bottom-center above the
 * readout so the scene stays interactive behind them. The first card is the
 * identity — an HONEST one: the instrument is inspired by the Posner molecule
 * (a contested quantum-biology hypothesis), and the 863 Hz frequency is REAL
 * phosphorus-31 NMR physics. The tour advances when the matching interaction
 * happens (useTourState). The scene is never blocked — the tour is a hint.
 */
import type { TourStep } from '../hooks/useTourState';

interface GuidedTourProps {
  step: TourStep;
  /** The "begin" affordance (welcome only). */
  onBegin?: () => void;
  onSkip: () => void;
}

const COPY: Record<TourStep, { title: string; body: string }> = {
  welcome: {
    title: 'a Posner molecule',
    body:
      'physicists proposed this molecule protects quantum coherence in the brain — the idea is contested. the frequency is real: phosphorus-31 rings at 863 Hz in Earth’s magnetic field. you’re arranging that resonance in space.',
  },
  look: {
    title: 'look around',
    body: 'drag anywhere to look around the sphere — the whole sky is yours.',
  },
  place: {
    title: 'place a sound',
    body: 'tap "place a zone" — it becomes a phosphorus on the molecule you can play.',
  },
  play: {
    title: 'hear it',
    body: 'tap a star to hear its resonance. one finger drags you closer.',
  },
};

export function GuidedTour({ step, onBegin, onSkip }: GuidedTourProps) {
  const copy = COPY[step];
  const stepIndex = step === 'welcome' ? 1 : step === 'look' ? 2 : step === 'place' ? 3 : 4;
  return (
    <div className="mm-tour" role="region" aria-label="how the instrument works">
      <p className="mm-tour__step" aria-hidden="true">
        {stepIndex} / 4
      </p>
      <h2 className="mm-tour__title">{copy.title}</h2>
      <p className="mm-tour__body">{copy.body}</p>
      <div className="mm-tour__actions">
        {step === 'welcome' && onBegin && (
          <button
            type="button"
            className="mm-btn mm-btn-accent mm-tour__begin"
            onClick={onBegin}
            data-agent-kind="action"
            data-agent-action="instrument.tour.begin"
            data-agent-danger="none"
            data-agent-confirm="never"
          >
            let’s play
          </button>
        )}
        <button
          type="button"
          className="mm-btn mm-tour__skip"
          onClick={onSkip}
          data-agent-kind="action"
          data-agent-action="instrument.tour.skip"
          data-agent-danger="none"
          data-agent-confirm="never"
        >
          skip
        </button>
      </div>
    </div>
  );
}