import { useHudStore } from '../store/useHudStore';
import HUDPill from './HUDPill';
import HUDPopover from './HUDPopover';

export type Side = 'left' | 'right';

function Dock({ side }: { side: Side }) {
  const section = side === 'left' ? useHudStore((s) => s.hudLeft) : useHudStore((s) => s.hudRight);
  const setHudLeft = useHudStore((s) => s.setHudLeft);
  const setHudRight = useHudStore((s) => s.setHudRight);

  const close = () => {
    if (side === 'left') setHudLeft(null);
    else setHudRight(null);
  };

  return (
    <div className={`hud-shell hud-shell--${side}${section ? ' hud-shell--open' : ''}`}>
      {section ? (
        <HUDPopover side={side} section={section} onClose={close} />
      ) : (
        <HUDPill side={side} />
      )}
    </div>
  );
}

export default function HUDShell() {
  return (
    <>
      <Dock side="left" />
      <Dock side="right" />
    </>
  );
}
