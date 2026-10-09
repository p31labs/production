interface SparklineProps {
  points: number[];
  accent?: 'cyan' | 'violet' | 'gold' | 'green' | 'red';
  height?: number;
  width?: number;
}

const ACCENT: Record<NonNullable<SparklineProps['accent']>, string> = {
  cyan: 'var(--p31-accent-cyan)',
  violet: 'var(--p31-accent-violet)',
  gold: 'var(--p31-accent-gold)',
  green: 'var(--p31-accent-green)',
  red: 'var(--p31-accent-red)',
};

/** Inline SVG sparkline — a 7-day trend read in ~200ms ("numbers need context"). */
export function Sparkline({ points, accent = 'cyan', height = 28, width = 96 }: SparklineProps) {
  if (!points || points.length < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const pad = 2;

  const coords = points.map((v, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const stroke = ACCENT[accent];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={coords.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
    </svg>
  );
}

export default Sparkline;