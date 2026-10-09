/**
 * faces/audit/AuditFace.tsx — the audit surface (the product).
 *
 * Renders the durable ledger as a timeline, verifies the hash chain, and
 * exports the AAT-aligned audit record. This is the glass box as a first-class
 * product surface — the enterprise pricing-power feature.
 */
import { useEffect, useState } from 'react';
import { fetchEvents, verifyChain } from '../../bus/client';
import type { FaceManifest } from '../../shell/face';
import type { BusEvent } from '../../bus/events';

interface ChainState { valid: boolean; total_entries: number; last_hash?: string }

export function AuditFace({ manifest }: { manifest: FaceManifest }) {
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [chain, setChain] = useState<ChainState | null>(null);
  const [loading, setLoading] = useState(false);
  const [exported, setExported] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [evts, ch] = await Promise.all([fetchEvents(100), verifyChain()]);
    setEvents(evts);
    setChain(ch);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, []);

  const exportN = async (format: 'jsonl' | 'csv') => {
    const res = await fetch(format === 'jsonl' ? '/api/bus/export' : '/api/bus/export?format=csv');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `p31-audit-${new Date().toISOString().slice(0, 10)}.${format === 'jsonl' ? 'jsonl' : 'csv'}`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2500);
  };

  return (
    <div className="audit-face">
      <h1 className="audit-face__title">{manifest.wordmark}</h1>
      <p className="audit-face__lede">The durable, hash-chained event ledger — every decision, replayable and verifiable.</p>

      <div className="audit-face__actions">
        <button type="button" className="audit-face__btn" onClick={refresh} disabled={loading} data-agent-kind="action" data-agent-action="audit.refresh">
          {loading ? 'Checking…' : 'Refresh'}
        </button>
        <button type="button" className="audit-face__btn" onClick={() => exportN('jsonl')} data-agent-kind="action" data-agent-action="audit.export.ndjson">
          Export NDJSON
        </button>
        <button type="button" className="audit-face__btn" onClick={() => exportN('csv')} data-agent-kind="action" data-agent-action="audit.export.csv">
          Export CSV
        </button>
      </div>

      {chain && (
        <div className={`audit-face__chain audit-face__chain--${chain.valid ? 'ok' : 'bad'}`}>
          <span className="audit-face__chain-badge">{chain.valid ? 'chain intact' : 'chain BROKEN'}</span>
          <span className="audit-face__chain-meta">{chain.total_entries} events · last {chain.last_hash?.slice(0, 12)}…</span>
        </div>
      )}
      {exported && <p className="audit-face__exported" role="status">Exported. Verify the SHA-256 line against the ledger.</p>}

      <div className="audit-face__ledger">
        <h2 className="audit-face__ledger-title">Event timeline</h2>
        {events.length === 0 ? (
          <p className="audit-face__empty">No events yet — run the studio to seed the ledger.</p>
        ) : (
          <ol className="audit-face__timeline">
            {events.map((ev, i) => (
              <li key={`${ev.type}-${i}`} className="audit-face__entry">
                <span className="audit-face__entry-type">{ev.type}</span>
                <code className="audit-face__entry-data">{JSON.stringify(ev).slice(0, 120)}</code>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}