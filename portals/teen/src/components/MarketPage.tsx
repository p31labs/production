import { useState } from 'react';

interface MarketPageProps {
  active: boolean;
}

const LISTINGS = [
  { title: 'Spoon Ritual: Morning Routine', price: 15, seller: 'P31 Labs' },
  { title: 'Sensory Filter Pro', price: 25, seller: 'P31 Labs' },
  { title: 'Quantum Focus Patch', price: 40, seller: 'Independent' },
];

export default function MarketPage({ active }: MarketPageProps) {
  const [search, setSearch] = useState('');

  const filtered = LISTINGS.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section className={`page${active ? ' active' : ''}`} id="page-market" role="tabpanel">
      <h2>🛒 Marketplace</h2>
      <input
        type="text"
        className="search-box"
        placeholder="Search offers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search"
      />
      <div id="marketplaceListings">
        {filtered.map((listing) => (
          <div key={listing.title} className="listing">
            <div className="listing-title">{listing.title}</div>
            <div className="listing-price">{listing.price} LOVE</div>
            <div className="listing-seller">{listing.seller}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
