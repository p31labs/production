import { PreviewRenderer, hasLivePreview } from './PreviewRenderer';
import type { CatalogEntry } from '../data/catalog';

interface ContractPillsProps {
  entry: CatalogEntry;
}

function PillGroup({ label, items, variant }: { label: string; items: string[]; variant: 'default' | 'warn' | 'token' }) {
  if (items.length === 0) return null;
  return (
    <div className="contract-pills__group">
      <span className="contract-pills__label">{label}</span>
      <div className="contract-pills__list">
        {items.map((item) => (
          <span key={item} className={`contract-pills__pill contract-pills__pill--${variant}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ContractPills({ entry }: ContractPillsProps) {
  const parts = entry.parts ?? [];
  const states = entry.states ?? [];
  const forbidden = entry.forbidden ?? [];
  const tokens = entry.tokens;

  return (
    <div className="contract-pills">
      <PillGroup label="Parts" items={parts} variant="default" />
      <PillGroup label="States" items={states} variant="default" />
      <PillGroup label="Forbidden" items={forbidden} variant="warn" />
      <PillGroup label="Tokens" items={tokens} variant="token" />
    </div>
  );
}

interface CatalogDetailProps {
  entry: CatalogEntry;
  onPlace: () => void;
}

export function CatalogDetail({ entry, onPlace }: CatalogDetailProps) {
  const live = hasLivePreview(entry.name);
  const canAfford = entry.spoonCost <= 3;

  return (
    <div className="catalog-detail">
      {live && (
        <div className="catalog-detail__preview">
          <PreviewRenderer component={entry} />
        </div>
      )}
      <div className="catalog-detail__body">
        <ContractPills entry={entry} />
        <div className="catalog-detail__actions">
          <span className="catalog-detail__cost">◆ {entry.spoonCost} spoon{entry.spoonCost !== 1 ? 's' : ''}</span>
          <button
            className="catalog-detail__place"
            onClick={onPlace}
            disabled={!canAfford}
          >
            Place
          </button>
        </div>
      </div>
    </div>
  );
}
