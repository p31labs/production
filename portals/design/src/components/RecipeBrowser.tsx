import { useMemo, useState } from 'react';
import { RECIPE_NAMES, RECIPE_MAP, RECIPE_CATEGORIES } from '@p31/design-core/mcp/data';

/** Browse all 171 recipe classes with live CSS preview. */
export default function RecipeBrowser() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return RECIPE_NAMES;
    return RECIPE_NAMES.filter((n) => n.toLowerCase().includes(q));
  }, [query]);

  const categoryOf = (name: string) =>
    Object.entries(RECIPE_CATEGORIES).find(([, names]) => names.includes(name))?.[0] ?? '—';

  return (
    <div className="recipe-browser">
      <div className="explorer-toolbar">
        <input
          className="input"
          placeholder="Search 171 recipes… (e.g. glass, btn, topbar)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search recipes"
        />
      </div>

      <div className="recipe-layout">
        <div className="recipe-list" role="listbox" aria-label="Recipe classes">
          {filtered.slice(0, 60).map((name) => (
            <button
              key={name}
              role="option"
              aria-selected={selected === name}
              className={`recipe-item ${selected === name ? 'is-active' : ''}`}
              onClick={() => setSelected(name)}
            >
              <span className="mono">.{name}</span>
              <span className="recipe-cat">{categoryOf(name)}</span>
            </button>
          ))}
        </div>

        <div className="recipe-preview">
          {selected ? (
            <>
              <div className="recipe-preview-head">
                <span className="mono" style={{ color: 'var(--p31-accent)' }}>.{selected}</span>
                <span className="recipe-cat">{categoryOf(selected)}</span>
              </div>
              <pre className="recipe-code">{RECIPE_MAP[selected]}</pre>
            </>
          ) : (
            <div className="token-empty">Select a recipe class to see its CSS.</div>
          )}
        </div>
      </div>
      <div className="explorer-meta">{RECIPE_NAMES.length} recipe classes · {Object.keys(RECIPE_CATEGORIES).length} categories</div>
    </div>
  );
}
