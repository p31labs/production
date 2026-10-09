
export interface CalmIndicatorProps {
  /** Current spoon level (0–5). Drives the tint and label. */
  spoons: number;
  /** Fired when tapped — opens the calm overlay or a spoon detail popover. */
  onOpen?: () => void;
  className?: string;
}

/**
 * CalmIndicator — the Calm pill shown in the status cluster.
 *
 * Reads the spoon level and renders a tinted pill. When spoons reaches 0, the
 * consumer should also mount `CalmOverlay`; this indicator is the topbar-level
 * affordance that opens it.
 */
export function CalmIndicator({ spoons, onOpen, className = '' }: CalmIndicatorProps) {
  // Low spoons = depleted = the alert state that surfaces CalmOverlay. The
  // pill reads "Calm" but its tone/label reflect the DEPLETED state, not a
  // restful one.
  const depleted = spoons <= 1;
  return (
    <button
      type="button"
      className={`calm-indicator ${depleted ? 'is-alert' : 'is-calm'} ${className}`.trim()}
      onClick={onOpen}
      aria-label={depleted ? 'Spoon level low — calm mode available' : 'Calm mode available'}
    >
      Calm
    </button>
  );
}

export default CalmIndicator;