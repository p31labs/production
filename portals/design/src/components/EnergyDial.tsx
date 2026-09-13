interface EnergyDialProps {
  level: number;
  max?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (next: number) => void;
  label?: string;
}

export default function EnergyDial({
  level,
  max = 5,
  size = 48,
  interactive = false,
  onChange,
  label = 'Spoon level',
}: EnergyDialProps) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(max, Math.round(level)));
  const ratio = clamped / max;
  const offset = circumference * (1 - ratio);
  const depleted = clamped === 0;
  const low = clamped <= Math.ceil(max / 3);

  const stroke = depleted
    ? 'var(--p31-accent-red)'
    : low
      ? 'var(--p31-accent-gold)'
      : 'var(--p31-accent)';
  const dialLabel = depleted ? 'Spent' : low ? 'Low' : clamped === max ? 'Full' : 'OK';

  const next = () => onChange?.((clamped + 1) % (max + 1));

  return (
    <div className="flex flex-col items-center gap-1" style={{ width: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 54 54"
        style={{ transform: 'rotate(-90deg)', cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
        role={interactive ? 'button' : 'img'}
        aria-label={`${label}: ${clamped} of ${max}`}
        tabIndex={interactive ? 0 : undefined}
        onClick={interactive ? next : undefined}
        onKeyDown={(e) => {
          if (interactive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            next();
          }
        }}
      >
        <circle
          cx="27"
          cy="27"
          r={radius}
          fill="none"
          stroke="var(--p31-glass-border)"
          strokeWidth="4"
        />
        <circle
          cx="27"
          cy="27"
          r={radius}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.4s ease, stroke 0.3s ease' }}
        />
        <text
          x="27"
          y="31"
          textAnchor="middle"
          fontWeight="500"
          fontSize="14"
          fill="var(--p31-text)"
          fontFamily="var(--p31-font-mono, monospace)"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {clamped}
        </text>
      </svg>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          color: 'var(--p31-text-secondary)',
        }}
      >
        {dialLabel}
      </span>
    </div>
  );
}