import type { CatalogEntry } from '../data/catalog';
import { CatalogDetail } from './CatalogDetail';

interface BrickRowProps {
  entry: CatalogEntry;
  expanded: boolean;
  onToggle: () => void;
  onClick: () => void;
}

export function BrickRow({ entry, expanded, onToggle, onClick }: BrickRowProps) {
  const hasContract = entry.type === 'contract' || (entry.states && entry.states.length > 0);

  return (
    <div className="catalog-brick-wrapper">
      <button
        className="catalog-brick"
        onClick={(e) => {
          e.stopPropagation();
          if (hasContract) onToggle();
          onClick();
        }}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('component-name', entry.name);
          e.dataTransfer.effectAllowed = 'copy';
        }}
        data-category={entry.category}
        data-name={entry.name}
        data-type={entry.type}
        aria-expanded={hasContract ? expanded : undefined}
      >
        <span className="catalog-brick__dot" aria-hidden="true">
          <span className="catalog-brick__dot-inner" />
        </span>
        <span className="catalog-brick__name">{entry.name}</span>
        <span className="catalog-brick__desc">{entry.description}</span>
        <span className="catalog-brick__cost">◆ {entry.spoonCost}</span>
        <span className="catalog-brick__meta">
          <span className="catalog-brick__meta-item">{entry.category}</span>
          <span className="catalog-brick__meta-item">{entry.type}</span>
          {hasContract && (
            <span className="catalog-brick__meta-item contract">
              {entry.type === 'contract' ? 'contract' : `${entry.states?.length ?? 0} states`}
            </span>
          )}
          {entry.forbidden?.length ? (
            <span className="catalog-brick__meta-item contract">
              ⚠ {entry.forbidden.length}
            </span>
          ) : null}
          <span className={`catalog-brick__chevron${expanded ? ' expanded' : ''}`} aria-hidden="true">
            ▸
          </span>
        </span>
      </button>
      {expanded && hasContract && (
        <div className="catalog-brick-expand">
          <CatalogDetail entry={entry} onPlace={onClick} />
        </div>
      )}
    </div>
  );
}
