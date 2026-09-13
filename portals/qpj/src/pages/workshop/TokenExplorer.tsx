import { useMemo, useState } from 'react';
import { TOKEN_MAP } from '@p31/design-core/mcp/data';

interface TokenRow {
  key: string;
  cssVar: string;
  value: string;
}

type Group = 'all' | 'color' | 'spacing' | 'radius' | 'type' | 'blur' | 'shadow';

const GROUPS: Group[] = ['all', 'color', 'spacing', 'radius', 'type', 'blur', 'shadow'];

/** Searchable token explorer over the design-core CSS custom properties. */
export function TokenExplorer() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<Group>('all');

  const rows = useMemo<TokenRow[]>(
    () => Object.entries(TOKEN_MAP).map(([key, value]) => ({ key, ...value })),
    []
  );

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const inGroup =
        group === 'all' ||
        (group === 'color' && r.key.startsWith('color')) ||
        (group === 'spacing' && r.key.startsWith('spacing')) ||
        (group === 'radius' && r.key.startsWith('radius')) ||
        (group === 'type' && r.key.startsWith('typography')) ||
        (group === 'blur' && r.key.startsWith('blur')) ||
        (group === 'shadow' && r.key.startsWith('shadow'));
      const inQuery =
        !q ||
        r.key.toLowerCase().includes(q) ||
        r.cssVar.toLowerCase().includes(q) ||
        r.value.toLowerCase().includes(q);
      return inGroup && inQuery;
    });
  }, [query, group, rows]);

  return (
    <div className="token-explorer">
      <div className="explorer-toolbar">
        <input
          className="input"
          placeholder="Search tokens… (e.g. accent, spacing, radius)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tokens"
        />
        <div className="explorer-groups" role="group" aria-label="Token category">
          {GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={group === g}
              className={`chip${group === g ? ' chip-active' : ''}`}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="token-grid" role="list">
        {entries.slice(0, 48).map((r) => (
          <div className="token-card" key={r.key} role="listitem">
            <div className="token-key">{r.key}</div>
            <div className="token-var">{r.cssVar}</div>
            <div className="token-value">{r.value}</div>
          </div>
        ))}
        {entries.length === 0 && <div className="token-empty">No tokens match “{query}”.</div>}
      </div>
      <div className="explorer-meta">
        Showing {Math.min(entries.length, 48)} of {entries.length} · {rows.length} total tokens
      </div>
    </div>
  );
}