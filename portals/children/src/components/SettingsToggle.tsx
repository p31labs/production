interface SettingsToggleProps {
  label: string;
  desc: string;
  active: boolean;
  onToggle: () => void;
}

export default function SettingsToggle({ label, desc, active, onToggle }: SettingsToggleProps) {
  return (
    <div className="setting-row">
      <div>
        <div className="setting-label">{label}</div>
        <div className="setting-desc">{desc}</div>
      </div>
      <button
        className={`toggle${active ? ' active' : ''}`}
        onClick={onToggle}
        aria-label={`Toggle ${label}`}
        aria-pressed={active}
      />
    </div>
  );
}
