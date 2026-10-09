
export type ModeTone = 'spark' | 'maker' | 'workshop';

export interface ModePillProps {
  /** Current mode. */
  mode: ModeTone;
  /** Fired when the pill is activated — cycles or opens a picker. */
  onCycle?: () => void;
  className?: string;
}

const MODE_LABEL: Record<ModeTone, string> = {
  spark: 'SPARK',
  maker: 'MAKER',
  workshop: 'WORKSHOP',
};

/**
 * ModePill — the primary mode control (SPARK / MAKER / WORKSHOP).
 *
 * Owns its tone tokens; the Topbar places it in the `mode` slot, between the
 * status cluster and the pinned trailing actions.
 */
export function ModePill({ mode, onCycle, className = '' }: ModePillProps) {
  return (
    <button
      type="button"
      className={`mode-pill mode-pill--${mode} ${className}`.trim()}
      onClick={onCycle}
      aria-label={`Mode: ${MODE_LABEL[mode]}. Activate to change.`}
    >
      <span className="mode-pill__dot" aria-hidden="true" />
      {MODE_LABEL[mode]}
    </button>
  );
}

export default ModePill;