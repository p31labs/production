import { useState, useMemo, useCallback, useRef } from 'react';
import { CatalogCard } from '../components/CatalogCard';
import { BrickRow } from '../components/BrickRow';
import { GamificationBar } from '../components/GamificationBar';
import { CATALOG } from '../data/catalog';
import { useSpoons } from '../store/spoons';
import { useGamification } from '../store/gamification';
import { CrisisOverlay, SpoonDial } from '@p31/design-core/compositions';
import type { CatalogEntry } from '../data/catalog';
import './CatalogPage.css';

const CATEGORIES = ['all', 'action', 'surface', 'navigation', 'feedback', 'ambient', 'contract'] as const;
type Category = (typeof CATEGORIES)[number];

export default function CatalogPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'bricks'>('bricks');
  const [isDropZone, setIsDropZone] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const spoons = useSpoons((s) => s.spoons);
  const setSpoons = useSpoons((s) => s.setSpoons);
  const placeComponent = useGamification((s) => s.placeComponent);
  const dismissCrisis = useGamification((s) => s.dismissCrisis);
  const resetAfterRest = useGamification((s) => s.resetAfterRest);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return CATALOG.filter((c) => {
      const matchSearch = !query ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tokens.some((t) => t.toLowerCase().includes(q));
      const matchCategory = category === 'all' || c.category === category;
      return matchSearch && matchCategory;
    });
  }, [query, category]);

  const handleCategory = useCallback((cat: Category) => {
    setCategory(cat);
    const url = new URL(window.location.href);
    if (cat === 'all') url.searchParams.delete('cat');
    else url.searchParams.set('cat', cat);
    window.history.replaceState({}, '', url);
  }, []);

  const toggleExpand = useCallback((name: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDropZone(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDropZone(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDropZone(false);
    const name = e.dataTransfer.getData('component-name');
    if (!name) return;
    const component = CATALOG.find((c) => c.name === name) as CatalogEntry | undefined;
    if (!component) return;

    const result = placeComponent(component.spoonCost);
    if (!result.success) return;

    window.dispatchEvent(new CustomEvent('p31:place-component', {
      detail: {
        name: component.name,
        title: `${component.name} surface`,
        code: `<${component.name}>${component.description}</${component.name}>`,
        html: `<div class="${component.cssClass}">${component.name}</div>`,
      },
    }));
  }, [placeComponent]);

  const handleRowClick = useCallback((entry: CatalogEntry) => {
    const result = placeComponent(entry.spoonCost);
    if (result.success) {
      window.dispatchEvent(new CustomEvent('p31:place-component', {
        detail: {
          name: entry.name,
          title: `${entry.name} surface`,
          code: `<${entry.name}>${entry.description}</${entry.name}>`,
          html: `<div class="${entry.cssClass}">${entry.name}</div>`,
        },
      }));
    }
  }, [placeComponent]);

  return (
    <div
      className="catalog-page"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="catalog-header">
        <div className="catalog-brand">
          <span className="catalog-title">Component Catalog</span>
          <span className="catalog-subtitle">{filtered.length} of {CATALOG.length} P31 components</span>
        </div>
        <div className="catalog-header__actions">
          <SpoonDial level={spoons} onChange={setSpoons} aria-label="Spoon level" />
          <form className="catalog-search" onSubmit={(e) => e.preventDefault()}>
            <input
              type="search"
              placeholder="Search components, tokens..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="catalog-search-input"
              aria-label="Search components"
            />
          </form>
          <div className="catalog-view-toggle">
            <button
              className={`catalog-view-btn${viewMode === 'bricks' ? ' active' : ''}`}
              onClick={() => setViewMode('bricks')}
              aria-pressed={viewMode === 'bricks'}
            >
              Bricks
            </button>
            <button
              className={`catalog-view-btn${viewMode === 'grid' ? ' active' : ''}`}
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
            >
              Grid
            </button>
          </div>
        </div>
      </header>

      <nav className="catalog-filters" aria-label="Category filters">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`catalog-filter ${category === cat ? 'catalog-filter--active' : ''}`}
            onClick={() => handleCategory(cat)}
            aria-pressed={category === cat}
          >
            {cat}
          </button>
        ))}
      </nav>

      <div ref={scrollRef} className="catalog-content">
        {viewMode === 'bricks' ? (
          <div
            className={`catalog-bricks${isDropZone ? ' catalog-grid--drop' : ''}`}
            role="list"
          >
            {filtered.map((c) => (
              <BrickRow
                key={c.name}
                entry={c}
                expanded={expanded.has(c.name)}
                onToggle={() => toggleExpand(c.name)}
                onClick={() => handleRowClick(c)}
              />
            ))}
          </div>
        ) : (
          <main
            className={`catalog-grid${isDropZone ? ' catalog-grid--drop' : ''}`}
            role="list"
          >
            {filtered.map((c) => (
              <CatalogCard key={c.name} component={c} />
            ))}
          </main>
        )}

        {filtered.length === 0 && (
          <div className="catalog-empty" role="status">
            No components match &quot;{query}&quot;
          </div>
        )}
      </div>

      <GamificationBar />

      {spoons === 0 && (
        <CrisisOverlay
          visible
          message="All spoons spent. Complete a quest or rest to earn more."
          buttonLabel="I rested"
          onReady={() => {
            dismissCrisis();
            resetAfterRest();
          }}
        />
      )}
    </div>
  );
}
