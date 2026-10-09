/**
 * shell/chat/collab/RemoteCursor.tsx — the derived remote-cursor overlay.
 *
 * A remote participant's cursor renders in a layer pinned to
 * `pointer-events: none` — it never captures the local interaction. It does
 * not steal focus, scroll the viewport, or intercept a keystroke.
 */
import { useRemoteCursors } from './usePresence';

export function RemoteCursor() {
  const cursors = useRemoteCursors();
  if (cursors.length === 0) return null;

  return (
    <>
      <style>{`.remote-cursors { position: absolute; inset: 0; pointer-events: none; }`}</style>
      <div className="remote-cursors" aria-hidden="true">
        {cursors.map((c) => (
          <span key={c.did} className="remote-cursor" title={c.did}>
            {c.did.slice(0, 2)}
          </span>
        ))}
      </div>
    </>
  );
}