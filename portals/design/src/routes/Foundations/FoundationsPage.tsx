import { useMemo, useState, type CSSProperties } from 'react';
import tokensDtc from '@p31ca/canon/tokens.dtc.json';
import type { FoundationConfig } from '../../data/foundations';

/** A flattened DTCG token: dotted p31 path + resolved value + metadata. */
export interface FlattenedToken {
  path: string;      // p31.color.accent.default
  cssVar: string;    // --p31-color-accent-default
  value: unknown;    // resolved $value (string | number | { colorSpace, components })
  type?: string;
  deprecated?: boolean | string;
}

/** Flatten the p31 subtree into dotted tokens (collapse dual-form by dash key). */
function flattenP31(): FlattenedToken[] {
  const out: FlattenedToken[] = [];
  const seen = new Set<string>();
  const walk = (node: Record<string, unknown>, path: string[]) => {
    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      const seg = [...path, k];
      if (v && typeof v === 'object' && !('$value' in v)) {
        walk(v as Record<string, unknown>, seg);
      } else {
        const dotted = seg.join('.');
        const flat = seg.join('-');
        if (seen.has(flat)) continue;
        seen.add(flat);
        const tok = v as { $value?: unknown; $type?: string; $deprecated?: boolean | string };
        out.push({
          path: dotted,
          cssVar: `--${seg.join('-')}`,
          value: tok.$value,
          type: tok.$type,
          deprecated: tok.$deprecated,
        });
      }
    }
  };
  walk((tokensDtc as { p31: Record<string, unknown> }).p31 ?? {}, []);
  return out;
}

/** Render a DTCG value as a CSS-ish string (OKLCH colors, numbers, strings). */
export function formatTokenValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') {
    const v = value as { colorSpace?: string; components?: number[]; alpha?: number; value?: unknown; unit?: string };
    if (v.colorSpace && Array.isArray(v.components)) {
      const comp = v.components.map((n) => (typeof n === 'number' ? (n === Math.round(n) ? String(n) : n.toFixed(2)) : n)).join(' ');
      return `oklch(${comp}${v.alpha != null ? ` / ${v.alpha}` : ''})`;
    }
    if (v.value != null) return `${v.value}${v.unit ?? ''}`;
    return JSON.stringify(value);
  }
  return String(value);
}

export interface FoundationsPageProps extends FoundationConfig {}

/** FoundationsPage — renders a token branch from the canonical DTCG tree.
 *  Schema-driven: no hand-written token list. An empty branch is a finding,
 *  rendered as a visible warning, not papered over. */
export default function FoundationsPage({ branches, title, description }: FoundationsPageProps) {
  const [query, setQuery] = useState('');
  const tokens = useMemo(() => flattenP31(), []);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tokens.filter((t) => {
      const inBranch = branches.some((b) => t.path.startsWith(b));
      const inQuery = !q || t.path.toLowerCase().includes(q) || t.cssVar.toLowerCase().includes(q) || formatTokenValue(t.value).toLowerCase().includes(q);
      return inBranch && inQuery;
    });
  }, [tokens, branches, query]);

  return (
    <div className="surface" data-mcp-tool="foundationsSurface">
      <header className="surface-hero">
        <h1>{title}</h1>
        <p>{description}</p>
        <input
          className="input"
          placeholder={`Search ${title.toLowerCase()} tokens…`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Search ${title} tokens`}
          style={{ maxWidth: 360 }}
        />
      </header>
      {rows.length === 0 ? (
        <div className="warning" role="alert">
          ⚠️ Branch “{branches.join(', ')}” is empty in tokens.dtc.json — a token-tree finding, not a page failure.
        </div>
      ) : (
        <div className="token-grid">
          {rows.map((t) => (
            <div key={t.path} className="token-card" data-token={t.cssVar}>
              <div className="token-swatch" style={swatchStyle(t)} aria-hidden="true" />
              <div className="token-meta">
                <code className="token-path">{t.path}</code>
                <div className="token-value">{formatTokenValue(t.value)}</div>
                <div className="token-var">{t.cssVar}</div>
                {t.deprecated && <span className="token-deprecated">deprecated</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <footer className="surface-footer">
        {rows.length} tokens · source: <code>@p31ca/canon/tokens.dtc.json</code>
      </footer>
    </div>
  );
}

/** A swatch only for color-like tokens; otherwise no visual. */
function swatchStyle(t: FlattenedToken): CSSProperties | undefined {
  const v = t.value;
  if (v && typeof v === 'object' && (v as { colorSpace?: string }).colorSpace) {
    return { background: formatTokenValue(v) };
  }
  return undefined;
}