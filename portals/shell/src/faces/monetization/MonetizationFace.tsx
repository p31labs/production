/**
 * faces/monetization/MonetizationFace.tsx — the monetization face.
 *
 * A lightweight revenue/usage surface proving one-shell-many-faces: it reads
 * the bus (entitlement/love events) and renders canon compositions. The real
 * capital machine lives in the monetization portal; this face is the shell's
 * window onto it.
 */
import { useEffect, useState } from 'react';
import { useAdapters } from '../../shell/adapters';
import { MetricBadge } from '@p31ca/design-core/compositions';
import { StatusBadge } from '@p31ca/design-core/compositions';
import type { FaceManifest } from '../../shell/face';
import type { BusEvent } from '../../bus/events';

interface LoveStats { minted: number; last: string | null }
interface Meter { remaining: number | null }

export function MonetizationFace({ manifest }: { manifest: FaceManifest }) {
  const adapters = useAdapters();
  const [love, setLove] = useState<LoveStats>({ minted: 0, last: null });
  const [meter, setMeter] = useState<Meter>({ remaining: null });
  const [ledger, setLedger] = useState<BusEvent[]>([]);

  useEffect(() => {
    const sub = adapters.bus.subscribe();
    sub.on((ev) => {
      setLedger((prev) => (prev.length > 50 ? prev.slice(-50) : prev));
      if (ev.type === 'love.minted') {
        const p = ev as unknown as { amount?: number };
        setLove((s) => ({ minted: s.minted + (p.amount ?? 0), last: new Date().toISOString() }));
      }
      if (ev.type === 'entitlement.consumed') {
        const p = ev as unknown as { remaining?: number };
        setMeter({ remaining: p.remaining ?? null });
      }
    });
    return () => sub.close();
  }, [adapters.bus]);

  return (
    <div className="monetization-face">
      <h1 className="monetization-face__title">{manifest.wordmark}</h1>
      <p className="monetization-face__lede">The revenue surface — live from the bus.</p>

      <div className="monetization-face__metrics">
        <MetricBadge value={String(love.minted)} label="LOVE minted this session" />
        <MetricBadge value={meter.remaining != null ? String(meter.remaining) : '—'} label="Runs remaining (free tier)" />
        <StatusBadge status="online" label="Ledger live" />
      </div>

      <div className="monetization-face__ledger">
        <h2>Recent bus events</h2>
        {ledger.length === 0 ? (
          <p className="monetization-face__empty">Run the studio to see events stream in.</p>
        ) : (
          <ul className="monetization-face__events">
            {ledger.map((ev, i) => (
              <li key={i} className="monetization-face__event">
                <code>{ev.type}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}