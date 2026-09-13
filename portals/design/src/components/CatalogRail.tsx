interface CatalogRailProps {
  categories: readonly string[];
  counts: Record<string, number>;
  active: string;
  onCategoryChange: (category: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
}

export function CatalogRail({
  categories,
  counts,
  active,
  onCategoryChange,
  query,
  onQueryChange,
}: CatalogRailProps) {
  return (
    <nav className="catalog-rail" aria-label="Catalog filters">
      <div className="catalog-rail__filters no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`catalog-chip${active === cat ? ' is-active' : ''}`}
            onClick={() => onCategoryChange(cat)}
            aria-pressed={active === cat}
          >
            {cat}
            {counts[cat] !== undefined && <span className="catalog-chip__count">{counts[cat]}</span>}
          </button>
        ))}
      </div>
      <div className="catalog-search">
        <span className="catalog-search__icon" aria-hidden="true">⌕</span>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search components, tokens…"
          aria-label="Search components"
          className="catalog-search__input"
        />
      </div>
    </nav>
  );
}