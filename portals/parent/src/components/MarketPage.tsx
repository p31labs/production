interface MarketPageProps {
  active: boolean;
}

const LISTINGS = [
  { title: 'Spoon Ritual: Morning Routine', price: 15, seller: 'P31 Labs' },
  { title: 'Sensory Filter Pro', price: 25, seller: 'P31 Labs' },
];

export default function MarketPage({ active }: MarketPageProps) {
  return (
    <div className={`page${active ? ' active' : ''}`} id="page-market" role="tabpanel">
      <div className="bento-grid">
        <div className="card col-span-full">
          <div className="card-header">Sovereign Marketplace</div>
          <div className="marketplace-list">
            {LISTINGS.map((listing) => (
              <div key={listing.title} className="marketplace-item">
                <div>
                  <div style={{ fontWeight: 600 }}>{listing.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--site-text-dim)' }}>Audio cognitive primer.</div>
                </div>
                <span className="price">{listing.price} LOVE</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
