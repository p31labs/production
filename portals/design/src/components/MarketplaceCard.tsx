import { useState } from 'react';
import { StatusBadge } from '@p31ca/design-core/compositions';
import type { ShopItem } from '../data/marketplace';

interface Props {
  item: ShopItem;
}

/** A shop tile — suite surface-card (header/title/desc + chip meta + actions). */
export default function MarketplaceCard({ item }: Props) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const copyImport = async () => {
    const lines = [`import { ${item.name} } from '${item.importPath}'`, `// spoonCost: ${item.spoonCost} · LOVE ${item.lovePrice}`]
    await navigator.clipboard?.writeText(lines.join('\n'))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="surface-card" data-mcp-tool={`shopItem-${item.name.toLowerCase()}`} data-mcp-state="ready">
      <div className="surface-card-header">
        <span className="surface-card-title surface-card-title--mono">{item.name}</span>
        <StatusBadge
          status={item.status === 'stable' ? 'online' : item.status === 'beta' ? 'busy' : 'offline'}
          label={item.status}
        />
      </div>

      <p className="surface-card-desc">{item.description}</p>

      <div className="meta-row">
        <span className="chip">{item.category}</span>
        <span className="chip">◆ {item.spoonCost} spoons</span>
        <span className="chip">♥ {item.lovePrice} LOVE</span>
      </div>

      <span className="mono" style={{ fontSize: 11, color: 'var(--p31-text-tertiary)' }}>{item.importPath}</span>

      <div className="meta-row" style={{ marginTop: 4 }}>
        <button type="button" className="btn btn-glass" onClick={() => void copyImport()}>
          {copied ? 'Copied ✓' : 'Copy import'}
        </button>
        <button type="button" className="btn" onClick={() => setOpen(!open)}>
          {open ? 'Hide contract' : 'View contract'}
        </button>
      </div>

      {open && (
        <div className="surface-card-contract" style={{ borderTop: '1px solid var(--p31-glass-border)', paddingTop: 10 }}>
          {item.tokens.length > 0 && (
            <div>
              <h5 className="label-tiny">tokens</h5>
              <div className="meta-row">{item.tokens.slice(0, 6).map((t) => <span key={t} className="chip">{t}</span>)}</div>
            </div>
          )}
          {item.variants.length > 0 && (
            <div>
              <h5 className="label-tiny">variants</h5>
              <div className="meta-row">{item.variants.map((v) => <span key={v} className="chip">{v}</span>)}</div>
            </div>
          )}
          {item.slots.length > 0 && (
            <div>
              <h5 className="label-tiny">slots</h5>
              <div className="meta-row">{item.slots.map((s) => <span key={s} className="chip">{s}</span>)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}