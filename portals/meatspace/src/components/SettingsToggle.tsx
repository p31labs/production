import type { Tab } from '../types';

interface SettingsToggleProps {
  label: string;
  desc?: string;
  active: boolean;
  onToggle: () => void;
}

export default function SettingsToggle({ label, desc, active, onToggle }: SettingsToggleProps) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">{label}</div>
        {desc && <div className="setting-desc">{desc}</div>}
      </div>
      <button
        className={`button ${active ? '' : 'secondary'}`}
        style={{ fontSize: 'var(--p31-type-caption)', padding: 'var(--p31-space-xs) var(--p31-space-md)', minHeight: '44px', minWidth: 'auto' }}
        onClick={onToggle}
      >
        {active ? 'On' : 'Off'}
      </button>
    </div>
  );
}
