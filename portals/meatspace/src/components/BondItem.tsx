import type { Bond } from '../lib/game';

interface BondItemProps {
  bond: Bond;
}

export default function BondItem({ bond }: BondItemProps) {
  return (
    <div className="bond-item">
      <span style={{ fontSize: '10px', color: 'var(--p31-text-secondary)', fontFamily: 'var(--p31-font-mono)' }}>
        {bond.a.slice(0, 6)} ⟷ {bond.b.slice(0, 6)}
      </span>
      <span style={{ fontSize: '11px', color: bond.curvature >= 0 ? 'var(--p31-accent-green)' : 'var(--p31-accent-red)', fontWeight: 600 }}>
        {bond.curvature >= 0 ? '+' : ''}{bond.curvature.toFixed(2)}
      </span>
    </div>
  );
}
