import { useLiteralLabels } from '../lib/usePresentation';

interface Props {
  motion: 'full' | 'reduced' | 'none';
  saturation: 'normal' | 'muted';
  density: 'compact' | 'comfortable' | 'spacious';
  literalLabels: boolean;
  calm: boolean;
  onMotion: (v: 'full' | 'reduced' | 'none') => void;
  onSaturation: (v: 'normal' | 'muted') => void;
  onDensity: (v: 'compact' | 'comfortable' | 'spacious') => void;
  onLiteral: (v: boolean) => void;
  onCalm: () => void;
}

/**
 * The visible presentation controls — the neurodivergent-comfort toggles
 * surfaced as real UI, not URL params. Each control is 48px minimum with
 * aria-pressed and AAF attributes (same pattern as every Loom button).
 *
 * Calm mode is the single low-stimulation preset: muted saturation, reduced
 * motion, spacious density, literal labels — one tap, fully reversible.
 */
export function PresentationControls({
  motion,
  saturation,
  density,
  literalLabels,
  calm,
  onMotion,
  onSaturation,
  onDensity,
  onLiteral,
  onCalm,
}: Props) {
  const literal = useLiteralLabels();
  const label = (s: string) => (literal ? s : s);

  return (
    <div className="presentation-controls" role="group" aria-label="Comfort controls">
      <button
        type="button"
        className="presentation-toggle presentation-toggle--calm"
        onClick={onCalm}
        aria-pressed={calm}
        title="Calm mode — low-stimulation preset"
        data-agent-kind="action"
        data-agent-action="presentation.calm"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        {calm ? 'Calm on' : 'Calm'}
      </button>
      <button
        type="button"
        className="presentation-toggle"
        onClick={() => onMotion(motion === 'full' ? 'reduced' : motion === 'reduced' ? 'none' : 'full')}
        aria-pressed={motion !== 'full'}
        title="Motion"
        data-agent-kind="action"
        data-agent-action="presentation.motion"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        {label(motion === 'full' ? 'Motion: full' : motion === 'reduced' ? 'Motion: low' : 'Motion: off')}
      </button>
      <button
        type="button"
        className="presentation-toggle"
        onClick={() => onSaturation(saturation === 'normal' ? 'muted' : 'normal')}
        aria-pressed={saturation === 'muted'}
        title="Saturation"
        data-agent-kind="action"
        data-agent-action="presentation.saturation"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        {label(saturation === 'normal' ? 'Colors: full' : 'Colors: calm')}
      </button>
      <button
        type="button"
        className="presentation-toggle"
        onClick={() => onDensity(density === 'compact' ? 'comfortable' : density === 'comfortable' ? 'spacious' : 'compact')}
        aria-pressed={density !== 'comfortable'}
        title="Density"
        data-agent-kind="action"
        data-agent-action="presentation.density"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        {label(density === 'compact' ? 'Space: snug' : density === 'comfortable' ? 'Space: comfy' : 'Space: roomy')}
      </button>
      <button
        type="button"
        className="presentation-toggle"
        onClick={() => onLiteral(!literalLabels)}
        aria-pressed={literalLabels}
        title="Literal labels"
        data-agent-kind="action"
        data-agent-action="presentation.literal"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        {label(literalLabels ? 'Words: full' : 'Words: plain')}
      </button>
    </div>
  );
}