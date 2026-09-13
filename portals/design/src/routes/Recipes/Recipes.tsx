import { useMemo, useState } from 'react';
import { RECIPE_NAMES, RECIPE_MAP, RECIPE_CATEGORIES } from '@p31/design-core/mcp/data';
import { PageHeader } from '@p31/design-core/compositions';

/** Browse all 171 recipe classes with live CSS preview. */
export default function Recipes() {
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
    <>
      <PageHeader
        eyebrow="Copy-paste library"
        title="Recipes"
        lede="Browse all 171 recipe classes with live CSS preview — glass, buttons, topbars, and the crisis ladder."
      />
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
        <ul className="recipe-list">
          {filtered.map((name) => (
            <li key={name}>
              <button
                className={`recipe-item w-full text-left p-3 rounded-lg border transition-all ${
                  selected === name
                    ? 'border-accent bg-accent/10'
                    : 'border-glass-border bg-glass-bg hover:border-glass-border-strong'
                }`}
                onClick={() => setSelected(name)}
              >
                <div className="text-sm font-semibold">{name}</div>
                <div className="text-[11px] text-text-tertiary">{categoryOf(name)}</div>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <div className="recipe-preview">
            <pre className="p-4 rounded-lg border border-glass-border bg-void text-text font-mono text-xs overflow-auto">
              {RECIPE_MAP[selected] || '// No CSS available'}
            </pre>
          </div>
        )}
      </div>
      </div>
    </>
  );
}
