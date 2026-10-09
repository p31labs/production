import { useCallback } from 'react';
import { useHudStore } from '../store/useHudStore';

type Side = 'left' | 'right';

const LEFT_BUTTONS = [
  { id: 'data' as const, icon: '📊', label: 'Data' },
];

const RIGHT_BUTTONS = [
  { id: 'system' as const, icon: '📈', label: 'System' },
  { id: 'hardware' as const, icon: '🔌', label: 'Hardware' },
];

export default function HUDPill({ side }: { side: Side }) {
  const hudLeft = useHudStore((s) => s.hudLeft);
  const hudRight = useHudStore((s) => s.hudRight);
  const setHudLeft = useHudStore((s) => s.setHudLeft);
  const setHudRight = useHudStore((s) => s.setHudRight);

  const handleToggle = useCallback(
    (id: 'data' | 'system' | 'hardware') => {
      if (side === 'left') {
        setHudLeft(id === 'data' ? (hudLeft === id ? null : id) : null);
      } else {
        const next = (id === 'system' || id === 'hardware') ? id : null;
        setHudRight(hudRight === id ? null : next);
      }
    },
    [side, hudLeft, hudRight, setHudLeft, setHudRight],
  );

  const buttons = side === 'left' ? LEFT_BUTTONS : RIGHT_BUTTONS;
  const active = side === 'left' ? hudLeft : hudRight;

  return (
    <div className={`hud-pill hud-pill--${side}`}>
      {buttons.map(({ id, icon, label }) => (
        <button
          key={id}
          className={`hud-pill-btn${active === id ? ' active' : ''}`}
          onClick={() => handleToggle(id)}
          aria-label={label}
          title={label}
        >
          <span className="hud-pill-icon" aria-hidden="true">{icon}</span>
          <span className="hud-pill-label">{label}</span>
        </button>
      ))}
    </div>
  );
}
