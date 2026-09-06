import { useMemo, useState } from 'react';
import { TOKEN_MAP, TOKENS_DATA } from '@p31/design-core/mcp/data';

/** Searchable token explorer over all 124 CSS custom properties. */
export default function TokenExplorer() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<'all' | 'color' | 'spacing' | 'radius' | 'type' | 'blur' | 'shadow'>('all');

  const entries = useMemo(() => {
    const rows = Object.entries(TOKEN_MAP).map(([key, v]) => ({ key, ...v }));
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
      const inQuery = !q || r.key.toLowerCase().includes(q) || r.cssVar.toLowerCase().includes(q) || r.value.toLowerCase().includes(q);
      return inGroup && inQuery;
    });
  }, [query, group]);

  const groups = ['all', 'color', 'spacing', 'radius', 'type', 'blur', 'shadow'] as const;

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
        <div className="explorer-groups" role="tablist" aria-label="Token category">
          {groups.map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={group === g}
              className={`chip ${group === g ? 'chip-active' : ''}`}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="token-grid" role="list">
        {entries.slice(0, 48).map((r) => (
          <div className="token-card" key={r.key} role="listitem" title={r.raw}>
            <div className="token-key">{r.key}</div>
            <div className="token-var" style={{ color: 'var(--p31-accent)' }}>{r.cssVar}</div>
            <div className="token-value">{r.value}</div>
          </div>
        ))}
        {entries.length === 0 && <div className="token-empty">No tokens match “{query}”.</div>}
      </div>
      <div className="explorer-meta">Showing {Math.min(entries.length, 48)} of {entries.length} · {Object.keys(TOKENS_DATA).length ? '' : ''}{TOKEN_MAP ? Object.keys(TOKEN_MAP).length : 0} total tokens</div>
    </div>
  );
}
