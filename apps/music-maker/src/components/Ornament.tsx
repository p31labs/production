/**
 * The music maker — Ornament.
 *
 * The single floating bottom ornament that replaces the old topbar: sound,
 * the one primary action (place a zone), the zone selector, the render-mode
 * cycle, and the ⋯ overflow (mapping toggle, via a native <details> — Escape
 * and outside-click for free, no focus trap needed for a non-modal popover).
 * Plus the ⛶ immersive toggle. Visual hierarchy is deliberate: exactly ONE
 * solid-accent control (place a zone); everything else is ghost/icon.
 */
import { SoundToggle } from './SoundToggle';
import { ZoneMenu } from './ZoneMenu';
import type { MusicZone } from '../scene/musicZone';

export type RenderMode = 'constellation' | 'terrain' | 'bursts';

export interface OrnamentProps {
  zones: MusicZone[];
  selectedId: string | null;
  onSelectZone: (id: string) => void;
  /** The nearest zone's display name (the readout's old "nearest" fact). */
  nearestName: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  renderMode: RenderMode;
  onCycleRender: () => void;
  mapping: 'pitch' | 'brightness';
  onToggleMapping: () => void;
  onPlace: () => void;
  immersive: boolean;
  onToggleImmersive: () => void;
}

export function Ornament({
  zones,
  selectedId,
  onSelectZone,
  nearestName,
  soundEnabled,
  onToggleSound,
  renderMode,
  onCycleRender,
  mapping,
  onToggleMapping,
  onPlace,
  immersive,
  onToggleImmersive,
}: OrnamentProps) {
  return (
    <nav className="mm-ornament" aria-label="the instrument’s controls">
      <div className="mm-ornament__group">
        <button
          type="button"
          className="mm-btn mm-ornament__ghost mm-ornament__icon"
          aria-pressed={immersive}
          onClick={onToggleImmersive}
          title="hide the controls"
          data-agent-kind="action"
          data-agent-action="instrument.immersive.toggle"
          data-agent-danger="none"
          data-agent-confirm="never"
        >
          ⛶
        </button>
        <SoundToggle enabled={soundEnabled} onToggle={onToggleSound} />
      </div>

      <div className="mm-ornament__group">
        <button
          type="button"
          className="mm-btn mm-ornament__primary"
          onClick={onPlace}
          data-agent-kind="action"
          data-agent-action="instrument.zone.place"
          data-agent-danger="low"
          data-agent-confirm="optional"
        >
          ✦ place a zone
        </button>
        <ZoneMenu zones={zones} selectedId={selectedId} onSelect={onSelectZone} nearestName={nearestName} />
        <button
          type="button"
          className="mm-btn mm-ornament__ghost"
          onClick={onCycleRender}
          aria-pressed={renderMode !== 'constellation'}
          data-mobile="◐"
          data-agent-kind="action"
          data-agent-action="instrument.render.toggle"
          data-agent-danger="none"
          data-agent-confirm="never"
        >
          ◐ {renderMode}
        </button>
      </div>

      <div className="mm-ornament__group mm-ornament__end">
        <details className="mm-overflow">
          <summary className="mm-btn mm-ornament__ghost mm-ornament__icon" aria-label="more settings">
            ⋯
          </summary>
          <div className="mm-overflow__pop">
            <button
              type="button"
              className="mm-btn mm-ornament__ghost"
              onClick={onToggleMapping}
              aria-pressed={mapping === 'brightness'}
              data-agent-kind="action"
              data-agent-action="instrument.mapping.toggle"
              data-agent-danger="none"
              data-agent-confirm="never"
            >
              {mapping === 'pitch' ? 'height → pitch' : 'height → timbre'}
            </button>
          </div>
        </details>
      </div>
    </nav>
  );
}