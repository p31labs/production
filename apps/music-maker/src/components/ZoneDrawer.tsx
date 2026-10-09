/**
 * The music maker — ZoneDrawer.
 *
 * The right-edge inspector for the selected zone (a bottom sheet on mobile).
 * Same committed surface as the old panel (timbre, name, position, family
 * play history) plus the close affordance and the destructive clear action —
 * a clear belongs in the zone's own inspector, not a topbar button. The
 * clear keeps danger=medium / confirm=review (an AAF review-gated action).
 */
import { useCallback, useRef, useState } from 'react';
import type { MusicZone } from '../scene/musicZone';

export interface ZoneDrawerProps {
  zone: MusicZone | null;
  /** Commit a rename — the same committed path as the Loom's log. */
  onRename: (id: string, name: string) => void;
  /** Commit a clear of the selected zone. */
  onClear: (id: string) => void;
  /** Close the drawer (deselect) — one function, three triggers (drawer ×,
   *  Escape, empty-canvas tap). */
  onClose: () => void;
  announce: (text: string) => void;
  /** Times this zone sounded on THIS device (the local triggers map). */
  playCount: number;
  /** Recently heard by family members (the DO's ephemeral broadcast). */
  recentPlays: Array<{ author: string; at: number }>;
}

export function ZoneDrawer({ zone, onRename, onClear, onClose, announce, playCount, recentPlays }: ZoneDrawerProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset the draft when the selection changes to a different zone.
  const lastIdRef = useRef<string | null>(null);
  if (zone && zone.id !== lastIdRef.current) {
    lastIdRef.current = zone.id;
    setDraft(zone.name || zone.id);
  } else if (!zone) {
    lastIdRef.current = null;
  }

  const submit = useCallback(() => {
    if (!zone) return;
    const name = draft.trim();
    if (name && name !== (zone.name || zone.id)) {
      onRename(zone.id, name);
      announce(`this zone is now called ${name}`);
    }
  }, [zone, draft, onRename, announce]);

  if (!zone) return null;

  return (
    <aside className="mm-drawer" aria-label={`zone ${zone.name || zone.id}`}>
      <div className="mm-drawer__head">
        <h2 className="mm-drawer__title">{zone.name || zone.id}</h2>
        <button
          type="button"
          className="mm-btn mm-ornament__ghost mm-ornament__icon"
          onClick={onClose}
          aria-label="close the zone panel"
          data-agent-kind="action"
          data-agent-action="instrument.zone.drawer.close"
          data-agent-danger="none"
          data-agent-confirm="never"
        >
          ×
        </button>
      </div>
      <div className="mm-drawer__row">
        <span className="mm-drawer__key">timbre</span>
        <span className="mm-drawer__val">{zone.timbre}</span>
      </div>
      <div className="mm-drawer__row">
        <span className="mm-drawer__key">position</span>
        <span className="mm-drawer__val">
          {zone.position.map((v) => v.toFixed(2)).join(' · ')}
        </span>
      </div>
      <div className="mm-drawer__row">
        <span className="mm-drawer__key">heard here</span>
        <span className="mm-drawer__val">{playCount} times</span>
      </div>
      {recentPlays.length > 0 && (
        <div className="mm-drawer__row mm-drawer__history">
          <span className="mm-drawer__key">played by</span>
          <ul className="mm-drawer__val mm-drawer__plays">
            {recentPlays.slice(0, 5).map((p, i) => (
              <li key={i}>{p.author} · {Math.max(1, Math.round((Date.now() - p.at) / 60_000))}m ago</li>
            ))}
          </ul>
        </div>
      )}
      {zone.author && (
        <div className="mm-drawer__row">
          <span className="mm-drawer__key">placed by</span>
          <span className="mm-drawer__val">{zone.author}</span>
        </div>
      )}
      <form
        className="mm-drawer__row"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="mm-zone-name" className="mm-drawer__key">name</label>
        <input
          ref={inputRef}
          id="mm-zone-name"
          className="mm-drawer__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          aria-label="rename this zone"
        />
        <button
          type="submit"
          className="mm-btn"
          data-agent-kind="action"
          data-agent-action="instrument.zone.name"
          data-agent-danger="none"
          data-agent-confirm="never"
        >
          rename
        </button>
      </form>
      <button
        type="button"
        className="mm-btn mm-drawer__clear"
        onClick={() => onClear(zone.id)}
        data-agent-kind="action"
        data-agent-action="instrument.zone.clear"
        data-agent-danger="medium"
        data-agent-confirm="review"
      >
        clear this zone
      </button>
      <p className="mm-drawer__note">every change to this zone is in the family log.</p>
    </aside>
  );
}