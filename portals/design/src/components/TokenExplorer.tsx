import { useMemo, useState } from 'react';
import { TOKEN_MAP, TOKENS_DATA } from '@p31ca/design-core/mcp/data';

/** Searchable token explorer over all CSS custom properties (suite cards). */
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
    <div>
      <div className="meta-row">
        <input
          className="input"
          placeholder="Search tokens… (e.g. accent, spacing, radius)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tokens"
          style={{ maxWidth: 320 }}
        />
        <div className="meta-row" role="tablist" aria-label="Token category">
          {groups.map((g) => (
            <button
              key={g}
              type="button"
              role="tab"
              aria-selected={group === g}
              className={`chip ${group === g ? 'active' : ''}`}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="launcher-grid" role="list">
        {entries.slice(0, 48).map((r) => (
          <div className="surface-card" key={r.key} role="listitem" title={r.raw} style={{ padding: 12, gap: 4 }}>
            <span className="surface-card-title surface-card-title--mono">{r.key}</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--p31-accent)' }}>{r.cssVar}</span>
            <span className="mono" style={{ fontSize: 10, color: 'var(--p31-text-tertiary)', wordBreak: 'break-all' }}>{r.value}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="preview-box" style={{ minHeight: 120 }}>
            <span className="preview-box__text">No tokens match &quot;{query}&quot;.</span>
          </div>
        )}
      </div>
      <div className="mono" style={{ marginTop: 12, fontSize: 11, color: 'var(--p31-text-tertiary)' }}>
        Showing {Math.min(entries.length, 48)} of {entries.length} · {Object.keys(TOKENS_DATA).length ? '' : ''}{TOKEN_MAP ? Object.keys(TOKEN_MAP).length : 0} total tokens
      </div>
    </div>
  );
}