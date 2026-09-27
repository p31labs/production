/**
 * QPJ — SongPage: the spatial music maker, launched from the craft shed.
 *
 * The "street-song" artifact — a Craft option launches the instrument here.
 * The music maker is embedded as an IFRAME pointed at this same origin
 * (`/song`), with all /api/instrument/* traffic proxied by a Pages Function to
 * the deployed music-presence worker. Same-origin means the instrument's
 * relative /api/music/* calls and its WebSocket upgrade both flow through the
 * proxy — the browser never talks cross-origin, and identity (the Access
 * cookie) is carried server-side.
 *
 * The iframe is the instrument's whole surface; QPJ supplies the frame. A
 * back affordance returns to the craft shed. Reduced-motion and the family
 * shell's tone carry into the frame via the shared canon tokens the instrument
 * already uses.
 */
import { useMemo, useRef } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { getPassport } from '../lib/passports';
import { navigateTo } from '../lib/routes';
import { useSongBridge } from '../hooks/useSongBridge';
import { Button } from '@p31ca/design-core/compositions';

export function SongPage() {
  const passportId = useQpjStore((s) => s.passportId);
  const me = getPassport(passportId);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridge = useSongBridge(iframeRef);

  const instrumentUrl = useMemo(() => {
    // Same-origin iframe: the browser loads /song.html, and the app inside makes
    // relative /api/music/* calls that the Pages Function proxies to the
    // music-presence worker. ?room is omitted — the room derives from the
    // authenticated identity server-side.
    return `/song.html`;
  }, []);

  return (
    <main className="page song" id="song" aria-label="The spatial instrument">
      <header className="song__header card">
        <div>
          <h1 className="song__title">the street-song</h1>
          <p className="song__subtitle">
            {me.pickledName}'s instrument — place sounds in space, hear the family play along.
          </p>
        </div>
        <Button variant="ghost" onClick={() => navigateTo('craft')}>← back to the shed</Button>
      </header>
      {/* The collaborative live line — fed by the instrument's activity over the
          bridge. The DO log is the source of truth; this is the live hint. */}
      <p className="song__live" aria-live="polite">
        {bridge.live ?? `${me.pickledName}'s instrument is waking up`}
      </p>
      <div className="song__stage">
        <iframe
          ref={iframeRef}
          className="song__frame"
          src={instrumentUrl}
          title="the spatial music maker"
          sandbox="allow-scripts allow-same-origin"
          allow="autoplay"
          referrerPolicy="no-referrer"
          onLoad={() => bridge.ping()}
        />
      </div>
    </main>
  );
}