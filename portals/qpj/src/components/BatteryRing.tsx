import { clampSpoons } from '../lib/passports';

export interface BatteryRingProps {
  level: number;
  size?: number;
  label?: string;
}

const SPOON_LABELS = ['empty', 'low', 'okay', 'good', 'plenty', 'full'];

/**
 * The pickle-battery: spoons are the household energy currency.
 * 0–1 → "hangry", 3 → "good", 5 → "jar full".
 */
export function BatteryRing({ level, size = 96, label }: BatteryRingProps) {
  const spoons = clampSpoons(level);
  const pct = spoons / 5;
  const circumference = 2 * Math.PI * 40;
  const filled = circumference * pct;
  const drained = spoons === 0;

  return (
    <div
      className={`battery-ring${drained ? ' battery-ring--drained' : ''}`}
      role="img"
      aria-label={label ?? `Energy: ${SPOON_LABELS[spoons]} (${spoons} of 5 spoons)`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true">
        <circle className="battery-ring__track" cx="48" cy="48" r="40" fill="none" strokeWidth="8" />
        <circle
          className="battery-ring__fill"
          cx="48"
          cy="48"
          r="40"
          fill="none"
          strokeWidth="8"
          strokeDasharray={`${filled} ${circumference - filled}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className={`battery-ring__readout${drained ? ' battery-ring__readout--drained' : ''}`}>
        <span className="battery-ring__number">{spoons}</span>
        <span className="battery-ring__unit">spoons</span>
      </div>
    </div>
  );
}