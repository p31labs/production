import type { ReactNode } from 'react';
import { useQpjStore } from '../store/useQpjStore';
import { getPassport } from '../lib/passports';
import { useIdentity } from '../hooks/useIdentity';
import { BatteryRing } from './BatteryRing';
import { VerifiedBadge } from './topbar/VerifiedBadge';
import { WorkerChat } from '../features/worker/WorkerChat';
import { LOVELedgerCard } from './LOVELedgerCard';
import { MeshK4 } from './MeshK4';
import './site-shell.css';

interface SiteShellProps {
  passportId: string;
  children?: ReactNode;
}

export function SiteShell({ passportId, children }: SiteShellProps) {
  const me = getPassport(passportId);
  const spoons = useQpjStore((s) => s.spoons);
  const mode = useQpjStore((s) => s.mode);
  const { status, identity } = useIdentity(passportId);

  return (
    <div className="site-shell">
      <header className="site-shell__hero card">
        <div className="site-shell__id">
          <span className="site-shell__avatar" aria-hidden="true">{me.emoji}</span>
          <div>
            <h1 className="site-shell__name">{identity?.pickleName ?? me.pickledName}</h1>
            <p className="site-shell__meta">
              {me.role} · {mode}
              {status === 'ready' && identity && (
                <>
                  {' · '}
                  <VerifiedBadge passportId={passportId} />
                </>
              )}
            </p>
          </div>
        </div>
        <BatteryRing level={spoons} size={64} />
      </header>

      <WorkerChat passportId={passportId} />

      {children ?? (
        <section className="site-shell__artifacts card" aria-label="Your artifacts">
          <h2 className="section-eyebrow">Your artifacts</h2>
          <p className="site-shell__empty">Nothing here yet — ask your worker to build something.</p>
        </section>
      )}

      <div className="site-shell__grid">
        <LOVELedgerCard />
        <section className="site-shell__mesh card" aria-label="Your mesh">
          <h2 className="section-eyebrow">Mesh</h2>
          <MeshK4 />
        </section>
      </div>
    </div>
  );
}
