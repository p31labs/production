import { useSpoonsStore } from '../lib/useSpoonsStore';

/** CalmOverlay — shown at spoon level 0. Motion pauses, breathing circle rest stop. */
export function CalmOverlay() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);

  if (spoons !== 0) return null;

  return (
    <div className="calm-overlay active" role="dialog" aria-modal="true" aria-label="Calm mode">
      <div className="calm-circle" />
      <h1 style={{ fontSize: 36, fontWeight: 700, color: 'var(--p31-text-primary)', marginBottom: 8 }}>
        Take a breath.
      </h1>
      <p style={{ color: 'var(--p31-cloud)', maxWidth: 480, marginBottom: 32, fontSize: 18, textAlign: 'center' }}>
        Calm mode — everything has slowed down. You can rest here as long as you need.
      </p>
      <button className="btn btn-primary" type="button" style={{ padding: '12px 32px', fontSize: 18 }} onClick={() => setSpoons(2)}>
        Return to the workspace
      </button>
    </div>
  );
}

export default CalmOverlay;