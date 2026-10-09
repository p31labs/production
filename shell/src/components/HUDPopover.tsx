import { type Side } from './HUDShell';
import LeftDataHUD from './hud/LeftDataHUD';
import LeftNodeHUD from './hud/LeftNodeHUD';
import RightSystemHUD from './hud/RightSystemHUD';
import RightHardwareHUD from './hud/RightHardwareHUD';

const TITLES: Record<string, string> = {
  data: 'Data',
  larmor: 'Larmor',
  node: 'Node Inspector',
  system: 'System',
  hardware: 'Hardware',
};

export default function HUDPopover({ side, section, onClose }: { side: Side; section: string; onClose: () => void }) {
  return (
    <div className={`hud-popover hud-popover--${side}`}>
      <div className="hud-popover-header">
        <span className="hud-popover-title">{TITLES[section] || section}</span>
        <button className="hud-popover-close" onClick={onClose} aria-label="Close panel">✕</button>
      </div>
      <div className="hud-popover-body" data-panel={section}>
        <div className="hud-section">
          {side === 'left' && section === 'data' && <LeftDataHUD />}
          {side === 'left' && section === 'node' && <LeftNodeHUD />}
          {side === 'right' && section === 'system' && <RightSystemHUD />}
          {side === 'right' && section === 'hardware' && <RightHardwareHUD />}
        </div>
      </div>
    </div>
  );
}
