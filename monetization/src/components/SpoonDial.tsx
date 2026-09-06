interface SpoonDialProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export default function SpoonDial({ value, onChange, max = 5 }: SpoonDialProps) {
  return (
    <div className="spoon-dial" role="radiogroup" aria-label="Spoon level">
      {Array.from({ length: max + 1 }, (_, i) => i).map((level) => (
        <button
          key={level}
          type="button"
          className={`spoon-btn${value === level ? ' active' : ''}`}
          onClick={() => onChange(level)}
          role="radio"
          aria-checked={value === level}
          aria-label={`Spoon level ${level}`}
        >
          <span className="spoon-icon">🥄</span>
          <span className="spoon-level">{level}</span>
        </button>
      ))}
    </div>
  );
}
