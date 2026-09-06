interface CatalogPageProps {
  active: boolean;
}

const APPS = [
  { icon: '🧬', name: 'BONDING', desc: 'Build molecules' },
  { icon: '🎮', name: 'ARCADE', desc: 'Play games' },
  { icon: '🏦', name: 'LOVE Ledger', desc: 'Manage your LOVE' },
  { icon: '🔗', name: 'Federation', desc: 'Cross-chain identity' },
];

export default function CatalogPage({ active }: CatalogPageProps) {
  return (
    <section className={`page${active ? ' active' : ''}`} id="page-catalog" role="tabpanel">
      <h2>📦 Catalog</h2>
      <div id="catalogGrid" className="grid-4">
        {APPS.map((app) => (
          <div key={app.name} className="glass-card" style={{ cursor: 'pointer' }}>
            <div style={{ fontSize: '28px', textAlign: 'center' }}>{app.icon}</div>
            <div style={{ fontWeight: 600, marginTop: '4px', fontSize: '13px' }}>{app.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--p31-text-secondary)' }}>{app.desc}</div>
            <div style={{ fontSize: '10px', color: 'var(--p31-accent-green)', marginTop: '4px' }}>● live</div>
          </div>
        ))}
      </div>
    </section>
  );
}
