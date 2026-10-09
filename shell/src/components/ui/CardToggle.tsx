import type { KeyboardEvent } from 'react';

interface CardToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}

export function CardToggle({ label, description, checked, onChange }: CardToggleProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange();
    }
  };

  return (
    <div
      className="card-toggle"
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={onChange}
      onKeyDown={handleKeyDown}
    >
      <div className="card-toggle-text">
        <div className="card-toggle-label">{label}</div>
        <div className="card-toggle-desc">{description}</div>
      </div>
      <div className="card-toggle-box">
        {checked && <div className="card-toggle-check" />}
      </div>
    </div>
  );
}
