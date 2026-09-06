import ArcadeHub from './ArcadeHub';

interface ArcadePageProps {
  active: boolean;
  spoons: number;
  role?: 'child' | 'teen' | 'parent';
  onLoveEarned?: (amount: number, reason: string) => void;
}

export default function ArcadePage({ active, spoons, role, onLoveEarned }: ArcadePageProps) {
  return (
    <div className={`page${active ? ' active' : ''}`} id="page-arcade" role="tabpanel">
      <div className="bento-grid">
        <div className="card col-span-full">
          <div className="card-header">ARCADE</div>
          <ArcadeHub spoons={spoons} onLoveEarned={onLoveEarned} role={role} />
        </div>
      </div>
    </div>
  );
}
