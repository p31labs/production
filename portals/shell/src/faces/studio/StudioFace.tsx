/**
 * faces/studio/StudioFace.tsx — the studio face, as a 3-panel workbench.
 *
 * The brain-dump → artifact pipeline, rendered as a conversation: the user
 * message, the live pipeline trace (StageTrace), and the artifact preview in
 * the right panel. The shell owns the role gate (a viewer never reaches this
 * face — see Shell.tsx FaceRoute), so this face only carries the run.
 *
 * Layout: the Workbench frame (left sessions, center conversation, right
 * artifact). The face composes within it; the shell owns the geometry.
 */
import { useEffect, useRef, useState } from 'react';
import { useAdapters } from '../../shell/adapters';
import type { FaceManifest } from '../../shell/face';
import { StageTrace } from '../../components/StageTrace';
import { renderA2UISurface, type A2UINode } from '../../renderer/A2UI';
import type { BusEvent } from '../../bus/events';
import { runForge } from './forgeClient';
import { Workbench } from '../../shell/Workbench';

const DEMO_SURFACE: A2UINode[] = [
  { type: 'GlassPanel', props: { padding: 'md' }, children: [
    { type: 'MetricBadge', props: { value: 'Spoons', label: '4 · restored' } },
    { type: 'StatusBadge', props: { status: 'online', label: 'Gate passed' } },
    { type: 'Button', props: { variant: 'primary', label: 'Continue' } },
  ]},
];

interface Dump { id: number; text: string }

export function StudioFace({ manifest }: { manifest: FaceManifest }) {
  const adapters = useAdapters();
  const [input, setInput] = useState('');
  const [dumps, setDumps] = useState<Dump[]>([]);
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [running, setRunning] = useState(false);
  const [surface, setSurface] = useState<A2UINode[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const dumpSeq = useRef(0);

  useEffect(() => {
    // Subscribe to the live bus — surface any events the shell is streaming.
    const sub = adapters.bus.subscribe();
    const keyOf = (ev: BusEvent) => {
      const raw = ev as unknown as Record<string, unknown>;
      return `${ev.type}:${JSON.stringify(raw.payload ?? raw)}`;
    };
    sub.on((ev) => {
      setEvents((prev) => {
        // De-dupe by session+type+payload (replay + live can overlap; events
        // carry no client-side id — the ledger stamps the envelope id).
        const key = keyOf(ev);
        if (prev.some((p) => keyOf(p) === key)) return prev;
        return [...prev, ev];
      });
    });
    return () => sub.close();
  }, [adapters.bus]);

  const run = async () => {
    if (!input.trim() || running) return;
    const text = input.trim();
    setRunning(true);
    setSurface(null);
    setEvents([]);
    setError(null);
    setDumps((prev) => [...prev, { id: ++dumpSeq.current, text }]);
    setInput('');
    try {
      // Run the REAL ui-forge engine: it appends every event to the bus ledger
      // (the seam). The bus subscription renders them into the StageTrace.
      const sessionId = await runForge({
        title: text.slice(0, 60),
        entities: [{ name: 'item', fields: ['status'] }],
        actions: [{ name: 'open' }, { name: 'save' }],
        k: 4,
      });
      sessionIdRef.current = sessionId;
      setSurface(DEMO_SURFACE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'pipeline failed');
    } finally {
      setRunning(false);
    }
  };

  const downloadArtifact = () => {
    const blob = new Blob([JSON.stringify(surface ?? DEMO_SURFACE, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `p31-artifact-${sessionIdRef.current?.slice(0, 8) ?? 'studio'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const left = (
    <nav className="studio-sidebar" aria-label="Studio sessions">
      <span className="studio-sidebar__head">Sessions</span>
      {dumps.length === 0 ? (
        <p className="studio-sidebar__empty">No sessions yet — your builds appear here.</p>
      ) : (
        <ol className="studio-sidebar__list">
          {dumps.map((d) => (
            <li key={d.id} className="studio-sidebar__item">
              <span className="studio-sidebar__item-text">
                {d.text.slice(0, 40)}{d.text.length > 40 ? '…' : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </nav>
  );

  const center = (
    <div className="studio-thread">
      <div className="studio-thread__scroll">
        {dumps.length === 0 && !running && (
          <div className="studio-empty">
            <h1 className="studio-face__title">{manifest.wordmark}</h1>
            <p className="studio-face__lede">
              Type a brain dump — the pipeline turns it into a surface. Every step is visible.
            </p>
          </div>
        )}

        {dumps.map((d) => (
          <div key={d.id} className="forge-msg forge-msg--user">
            <span className="forge-msg__author">you</span>
            <p className="forge-msg__text">{d.text}</p>
          </div>
        ))}

        {running && events.length === 0 && (
          <div className="forge-msg forge-msg--live" role="status" aria-live="polite">
            <span className="forge-msg__author">the pipeline</span>
            <p className="forge-msg__text">⟳ working…</p>
          </div>
        )}

        {error && <p className="studio-face__error" role="alert">{error}</p>}

        {events.length > 0 && <StageTrace events={events} running={running} label="The pipeline" />}
      </div>

      <div className="studio-composer">
        <textarea
          className="studio-face__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. a spoon tracker that shows today's energy, a way to log wins, and a calm place to start tomorrow…"
          disabled={running}
          rows={3}
          aria-label="Your idea"
        />
        <button
          type="button"
          className="studio-face__run"
          onClick={run}
          disabled={running || !input.trim()}
          data-agent-kind="action"
          data-agent-action="studio.pipeline.run"
          data-agent-danger="none"
          data-agent-confirm="never"
        >
          {running ? 'Working…' : 'Build my surface'}
        </button>
      </div>
    </div>
  );

  const right = surface ? (
    <section className="studio-artifact" aria-label="Artifact">
      <div className="studio-artifact__head">
        <span className="studio-artifact__label">Artifact</span>
        {sessionIdRef.current && (
          <code className="studio-artifact__session" title="Session id">{sessionIdRef.current.slice(0, 8)}</code>
        )}
      </div>
      <div className="studio-artifact__body">{renderA2UISurface(surface)}</div>
      <div className="studio-artifact__actions">
        <button type="button" className="studio-artifact__btn" onClick={downloadArtifact}>
          Download
        </button>
        <button
          type="button"
          className="studio-artifact__btn studio-artifact__btn--ghost"
          onClick={() => adapters.notification.notify('info', 'Deploy', 'Deploy is a consequential action — gated for review.')}
        >
          Deploy
        </button>
      </div>
    </section>
  ) : null;

  return <Workbench left={left} center={center} right={right} />;
}