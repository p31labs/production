import { useMemo, useState } from 'react';
import { CatalogRail } from '../../components/CatalogRail';
import { CatalogRow } from '../../components/CatalogRow';
import { CATALOG } from '../../data/catalog';
import { useSpoonsStore } from '../../lib/useSpoonsStore';
import EnergyDial from '../../components/EnergyDial';
import '../../styles/catalog.css';

const CATEGORIES = ['all', 'action', 'surface', 'navigation', 'feedback', 'ambient', 'contract'];

export default function Home() {
  const spoons = useSpoonsStore((s) => s.spoons);
  const setSpoons = useSpoonsStore((s) => s.setSpoons);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: CATALOG.length };
    for (const entry of CATALOG) {
      c[entry.category] = (c[entry.category] ?? 0) + 1;
    }
    return c;
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((entry) => {
      const matchesCategory = category === 'all' || entry.category === category;
      const matchesQuery =
        !q ||
        entry.name.toLowerCase().includes(q) ||
        entry.description.toLowerCase().includes(q) ||
        entry.tokens.some((token) => token.toLowerCase().includes(q));
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const toggle = (name: string) => setExpanded((prev) => (prev === name ? null : name));

  return (
    <div className="pt-6">
      <section className="mb-12 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-text-tertiary">
          Design System Dashboard
        </p>
        <h1 className="sov-title">
          Sovereign <span data-segment="token-gradient">Design Tokens</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary">
          Interactive component catalog powered by strict semantic contracts. {CATALOG.length}{' '}
          components mapped. Single source of truth.
        </p>
        <div className="mt-6 flex items-center justify-center">
          <EnergyDial level={spoons} max={5} interactive onChange={setSpoons} />
        </div>
      </section>

      <CatalogRail
        categories={CATEGORIES}
        counts={counts}
        active={category}
        onCategoryChange={(next) => {
          setCategory(next);
          setExpanded(null);
        }}
        query={query}
        onQueryChange={(next) => {
          setQuery(next);
          setExpanded(null);
        }}
      />

      <div className="space-y-4" role="list" aria-label="Component catalog">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-glass-border py-20 text-center text-sm text-text-secondary">
            No components found matching &quot;{query}&quot;.
          </div>
        ) : (
          filtered.map((entry) => (
            <CatalogRow
              key={entry.name}
              entry={entry}
              expanded={expanded === entry.name}
              onToggle={() => toggle(entry.name)}
            />
          ))
        )}
      </div>
    </div>
  );
}