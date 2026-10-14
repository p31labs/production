import type { CSSProperties, ReactNode } from 'react';
import { Button } from '../Button';

export interface WizardStep {
  id: string;
  title: string;
}

export interface WizardProps {
  steps: readonly WizardStep[];
  activeIndex: number;
  onBack: () => void;
  onNext: () => void;
  onFinish: () => void;
  /** The ONE question group for the active step. */
  children: ReactNode;
  backLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/**
 * Wizard — the publish pattern: a "Step N of M" indicator, one question
 * group per step, and back/next (finish on the last step). Actions compose
 * canon Buttons; the indicator is a live region.
 */
export function Wizard({ steps, activeIndex, onBack, onNext, onFinish, children, backLabel = 'Back', nextLabel = 'Next', finishLabel = 'Finish', className = '', style }: WizardProps) {
  const step = steps[Math.min(activeIndex, steps.length - 1)];
  const isLast = activeIndex >= steps.length - 1;
  return (
    <div data-p31="wizard" className={className} style={style}>
      <p data-p31="wizard-indicator" aria-live="polite">
        Step {activeIndex + 1} of {steps.length}
      </p>
      <section data-p31="wizard-step" role="group" aria-label={step?.title}>
        {children}
      </section>
      <div data-p31="wizard-actions">
        <Button variant="secondary" onClick={onBack} disabled={activeIndex === 0}>{backLabel}</Button>
        {isLast ? (
          <Button onClick={onFinish}>{finishLabel}</Button>
        ) : (
          <Button onClick={onNext}>{nextLabel}</Button>
        )}
      </div>
    </div>
  );
}

export default Wizard;