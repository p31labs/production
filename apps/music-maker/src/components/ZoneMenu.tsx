/**
 * The music maker — ZoneMenu.
 *
 * The visible zone selector — a compact dropdown listing the zones (name +
 * timbre chip). Clicking selects the zone (it does NOT trigger — a star is
 * played by tapping the star). The keyboard path (ZoneListbox) is unchanged.
 */
import { useEffect, useRef, useState } from 'react';
import type { MusicZone } from '../scene/musicZone';

export interface ZoneMenuProps {
  zones: MusicZone[];
  selectedId: string | null;
  /** The nearest zone's display name — shown as a non-interactive first row
   *  (absorbing the old readout's "nearest" fact). */
  nearestName?: string | null;
  onSelect: (id: string) => void;
}

export function ZoneMenu({ zones, selectedId, nearestName, onSelect }: ZoneMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div className="mm-zone-menu" ref={rootRef}>
      <button
        type="button"
        className="mm-btn mm-zone-menu__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-agent-kind="action"
        data-agent-action="instrument.zones.toggle"
        data-agent-danger="none"
        data-agent-confirm="never"
      >
        zones · {zones.length}
      </button>
      {open && (
        <ul className="mm-zone-menu__list" role="listbox" aria-label="the zones">
          {nearestName && (
            <li className="mm-zone-menu__nearest" aria-hidden="true">
              nearest: {nearestName}
            </li>
          )}
          {zones.map((z) => (
            <li key={z.id}>
              <button
                type="button"
                className="mm-zone-menu__item"
                role="option"
                aria-selected={z.id === selectedId}
                onClick={() => {
                  onSelect(z.id);
                  setOpen(false);
                }}
                data-zone-id={z.id}
                data-agent-kind="action"
                data-agent-action="instrument.zone.select"
                data-agent-danger="none"
                data-agent-confirm="never"
              >
                <span className="mm-zone-menu__name">{z.name || z.id}</span>
                <span className="mm-zone-menu__timbre">{z.timbre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}