import type { Tab } from '../types';

interface RightRailProps {
  tab?: Tab;
  onNavigate?: (tab: Tab) => void;
}

export default function RightRail({ tab, onNavigate }: RightRailProps) {
  return (
    <aside id="right-rail" role="complementary" aria-label="Details">
      <div className="glass-card">
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--p31-text-secondary)', textTransform: 'uppercase', marginBottom: 'var(--p31-space-sm)' }}>
          Status
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p31-space-xs)', fontSize: '11px' }}>
          <div>🟢 LOVE Ledger</div>
          <div>🟢 Federation</div>
          <div>🟢 Marketplace</div>
          <div>🟢 DADS</div>
          <div>🟢 BROS</div>
        </div>
      </div>
      <div className="glass-card">
        <h3 style={{ fontSize: '11px', fontWeight: 600, color: 'var(--p31-text-secondary)', textTransform: 'uppercase', marginBottom: 'var(--p31-space-sm)' }}>
          Quick
        </h3>
        <button
          className="button secondary"
          style={{ width: '100%', fontSize: '11px' }}
          onClick={() => onNavigate?.('bonding')}
        >
          🧬 Build Molecule
        </button>
        <button
          className="button secondary"
          style={{ width: '100%', marginTop: 'var(--p31-space-xs)', fontSize: '11px' }}
          onClick={() => onNavigate?.('home')}
        >
          🛒 Browse
        </button>
      </div>
    </aside>
  );
}
