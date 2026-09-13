import { useEffect, useState } from 'react';
import { listSBTs, verifyChain, type QpjSBTRecord } from '../lib/sbt';

interface SBTGalleryProps {
  did: string;
}

const KIND_GLYPH: Record<QpjSBTRecord['kind'], string> = {
  achievement: '✦',
  credential: '◇',
  affiliation: '⟡',
  guardian: '☉',
};

export function SBTGallery({ did }: SBTGalleryProps) {
  const [records, setRecords] = useState<QpjSBTRecord[]>([]);
  const [chainStatus, setChainStatus] = useState<'checking' | 'valid' | 'broken' | 'empty'>('checking');

  useEffect(() => {
    const list = listSBTs(did);
    setRecords(list);
    if (list.length === 0) {
      setChainStatus('empty');
      return;
    }
    void verifyChain(did).then(({ valid }) => {
      setChainStatus(valid ? 'valid' : 'broken');
    });
  }, [did]);

  if (chainStatus === 'empty' || chainStatus === 'checking') {
    return (
      <section className="sbt-gallery card" aria-label="Soul-bound tokens">
        <h2 className="section-eyebrow">Your badges</h2>
        <p className="sbt-gallery__empty">
          No badges yet. They appear as you use the place.
        </p>
      </section>
    );
  }

  return (
    <section className="sbt-gallery card" aria-label="Soul-bound tokens">
      <header className="sbt-gallery__head">
        <h2 className="section-eyebrow">Your badges</h2>
        <span className={`sbt-gallery__chain sbt-gallery__chain--${chainStatus}`}>
          chain {chainStatus}
        </span>
      </header>
      <ul className="sbt-gallery__list">
        {records.map((r) => (
          <li key={r.id} className="sbt-gallery__item">
            <span className="sbt-gallery__glyph" aria-hidden="true">{KIND_GLYPH[r.kind]}</span>
            <div className="sbt-gallery__body">
              <span className="sbt-gallery__name">{r.name}</span>
              <span className="sbt-gallery__desc">{r.description}</span>
              <span className="sbt-gallery__meta">
                #{r.blockNumber} · {new Date(r.issuedAt).toLocaleDateString()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
