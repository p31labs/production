import { assembleCogPass, exportCogPassJSON } from '../lib/cogpass';
import type { Identity } from '../lib/identity';
import { VerifiedBadge } from './topbar/VerifiedBadge';
import '../pages/you/tetrahedron.css';

interface PassportCardProps {
  identity: Identity;
}

export function PassportCard({ identity }: PassportCardProps) {
  const cogpass = assembleCogPass(identity);
  const tetrahedron = cogpass.tetrahedron;
  const did = (tetrahedron.vertices[0]?.value as string) ?? identity.did;
  const reputation = tetrahedron.vertices[1]?.value as { careScore: number; trustTier: number; sbts: unknown[] } | undefined;
  const preferences = tetrahedron.vertices[2]?.value as { spoons: number; motionScale?: number; breathPattern?: string; contrastTarget?: string } | undefined;
  const relations = tetrahedron.vertices[3]?.value as { meshPeers?: string[]; familyDid?: string | null; guardianDid?: string | null } | undefined;

  const copy = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(text);
    }
  };

  return (
    <section className="you__passport card" aria-label="Cognitive passport">
      <h2 className="section-eyebrow">Cognitive passport</h2>
      <div className="card__tetrahedron">
        <div className="card__tetrahedron__vertex">
          <h3>Identity</h3>
          <VerifiedBadge passportId={identity.did.split(':')[1] ?? 'unknown'} />
          <p className="card__tetrahedron__value" title={did}>{did.slice(0, 32)}…</p>
          <button type="button" className="card__tetrahedron__copy" onClick={() => copy(did)}>
            Copy DID
          </button>
        </div>

        <div className="card__tetrahedron__vertex">
          <h3>Reputation</h3>
          <p className="card__tetrahedron__value">
            {reputation ? Math.round((reputation.careScore ?? 0.5) * 100) : 0}%
          </p>
          <p className="card__tetrahedron__meta">
            careScore · tier {reputation?.trustTier ?? 0} · {reputation?.sbts?.length ?? 0} SBTs
          </p>
        </div>

        <div className="card__tetrahedron__vertex">
          <h3>Preferences</h3>
          <p className="card__tetrahedron__value">
            {preferences ? `${preferences.spoons ?? 3} spoons · ${Math.round((preferences.motionScale ?? 1) * 100)}% motion` : '—'}
          </p>
          <p className="card__tetrahedron__meta">
            {preferences?.breathPattern ?? '4-4-6'} · contrast {preferences?.contrastTarget ?? 'AA'}
          </p>
        </div>

        <div className="card__tetrahedron__vertex">
          <h3>Relations</h3>
          <p className="card__tetrahedron__value">
            {relations ? `${relations.meshPeers?.length ?? 0} peers` : '—'}
          </p>
          <p className="card__tetrahedron__meta">
            {relations?.familyDid ? 'family linked' : 'no family'} · {relations?.guardianDid ? 'guardian set' : 'no guardian'}
          </p>
        </div>
      </div>

      <details className="you__passport-export">
        <summary>Export passport (JSON)</summary>
        <pre className="you__passport-json">{exportCogPassJSON(cogpass)}</pre>
      </details>
    </section>
  );
}
