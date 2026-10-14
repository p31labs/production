import type { CSSProperties, ReactNode } from 'react';
import { wizardTree } from '@p31ca/canon-parts/markup';
import { nodeToReact, pass, withHandlers, type MarkupNodeLike } from '../reactTree.js';

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
 * Wizard — the publish pattern. Actions compose the canon-parts button
 * recipe (.p31-btn, phase 2) instead of the seed's legacy design-core
 * Button classes — documented deviation (fix-plan §4).
 */
export function Wizard({ steps, activeIndex, onBack, onNext, onFinish, children, backLabel = 'Back', nextLabel = 'Next', finishLabel = 'Finish', className = '', style }: WizardProps) {
  const tree = wizardTree({
    steps: [...steps],
    activeIndex,
    children: pass(children),
    backLabel,
    nextLabel,
    finishLabel,
    className,
    style,
  });
  const actionBar = tree.children[2] as MarkupNodeLike;
  const [backBtn, nextBtn] = actionBar.children as [MarkupNodeLike, MarkupNodeLike];
  withHandlers(backBtn, { onClick: onBack });
  withHandlers(nextBtn, { onClick: activeIndex >= steps.length - 1 ? onFinish : onNext });
  return nodeToReact(tree);
}

export default Wizard;