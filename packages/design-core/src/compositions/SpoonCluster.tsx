
export interface SpoonClusterProps {
  /** Current spoon level (0–5). Filled dots = remaining. */
  level: number;
  /** Total dots. Default 5. */
  total?: number;
  className?: string;
}

/**
 * SpoonCluster — the spoon dots in the status cluster.
 *
 * Read-only. Pairs with `CalmIndicator`; together they form the metabolic
 * status segment of the topbar.
 */
export function SpoonCluster({ level, total = 5, className = '' }: SpoonClusterProps) {
  return (
    <span
      className={`spoon-cluster ${className}`.trim()}
      role="img"
      aria-label={`${level} of ${total} spoons remaining`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`spoon-cluster__dot ${i < level ? 'is-filled' : 'is-empty'}`}
        />
      ))}
    </span>
  );
}

export default SpoonCluster;