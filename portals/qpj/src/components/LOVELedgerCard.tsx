import { useState } from 'react';
import { Button } from '@p31/design-core/compositions';
import { useQpjStore } from '../store/useQpjStore';
import { decayedCareScore, LOVE_CARE_MAX } from '../lib/love';
import './love-ledger.css';

const SOURCE_LABELS: Record<string, string> = {
  talk: 'talked with the family',
  milestone: 'reached a milestone',
  artifact: 'launched an artifact',
  identity: 'claimed an identity',
  mesh: 'joined the street',
  care: 'gifted a care note',
};

const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 1 });

function timeAgo(at: number): string {
  const mins = Math.max(1, Math.round((Date.now() - at) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function LOVELedgerCard() {
  const love = useQpjStore((s) => s.love);
  const spendLove = useQpjStore((s) => s.spendLove);
  const [noteSentAt, setNoteSentAt] = useState<number | null>(null);

  const careScore = decayedCareScore(love.careScore, love.lastCareAt, Date.now());
  const scorePct = Math.round((careScore / LOVE_CARE_MAX) * 100);

  const onCareNote = () => {
    spendLove(1, 'the street');
    setNoteSentAt(Date.now());
  };

  return (
    <section className="love-ledger" aria-labelledby="love-ledger-title" data-love-ledger="true">
      <header className="love-ledger__head">
        <div>
          <h2 id="love-ledger-title" className="section-eyebrow">
            LOVE
          </h2>
          <p className="love-ledger__sub">Spoons run the day; LOVE keeps the family.</p>
        </div>
      </header>

      <div className="love-pools">
        <div
          className="love-pool"
          aria-label={`Sovereignty pool, ${fmt(love.sovereignty)}`}
        >
          <span className="love-pool__label">Sovereignty</span>
          <span className="love-pool__value">{fmt(love.sovereignty)}</span>
        </div>
        <div
          className="love-pool love-pool--spend"
          aria-label={`Performance pool, ${fmt(love.performance)}`}
        >
          <span className="love-pool__label">Performance</span>
          <span className="love-pool__value">{fmt(love.performance)}</span>
        </div>
      </div>

      <div className="love-score" aria-label={`Care score, ${scorePct} percent`}>
        <span className="love-score__label">Care score · {scorePct}%</span>
        <span className="love-score__track" aria-hidden="true">
          <span className="love-score__fill" style={{ width: `${scorePct}%` }} />
        </span>
      </div>

      <div className="love-ledger__actions">
        <Button size="sm" variant="ghost" onClick={onCareNote} disabled={love.performance < 1}>
          Gift a care note
        </Button>
        {noteSentAt !== null && (
          <span className="love-ledger__note">Care note recorded on the ledger.</span>
        )}
      </div>

      <ul className="love-ledger__log" aria-label="Recent LOVE ledger entries">
        {love.log
          .slice(-6)
          .reverse()
          .map((e) => (
            <li key={e.id} className="love-log-row">
              <span className={`love-log-row__delta love-log-row__delta--${e.kind}`}>
                {e.kind === 'earn' ? '+' : ''}
                {fmt(e.amount)}
              </span>
              <span className="love-log-row__text">
                {e.by} {SOURCE_LABELS[e.source] ?? e.source}
                {e.to ? ` \u2192 ${e.to}` : ''}
              </span>
              <span className="love-log-row__time">{timeAgo(e.at)}</span>
            </li>
          ))}
        {love.log.length === 0 && (
          <li className="love-ledger__empty">The ledger starts when care begins.</li>
        )}
      </ul>
    </section>
  );
}