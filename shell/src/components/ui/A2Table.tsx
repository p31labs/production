import { CSSProperties } from 'react';

export interface A2TableProps {
  caption?: string;
  headers: string[];
  rows: string[][];
  style?: CSSProperties;
}

export default function A2Table({ caption, headers, rows, style }: A2TableProps) {
  const cell = { padding: 'var(--p31-space-tiny)', borderBottom: '1px solid var(--p31-glass-border)', color: 'var(--p31-text)' };
  return (
    <div className="glass-card" style={{ overflowX: 'auto', ...style }}>
      <table role="grid" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        {caption ? (
          <caption style={{ fontSize: 11, fontWeight: 600, color: 'var(--p31-text-secondary)', padding: 'var(--p31-space-tiny)', textAlign: 'left' }}>
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: 'var(--p31-space-tiny)', color: 'var(--p31-text-secondary)', fontWeight: 600, textAlign: 'left', borderBottom: '1px solid var(--p31-glass-border)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {headers.map((_, c) => (
                <td key={c} style={cell}>{row[c] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
