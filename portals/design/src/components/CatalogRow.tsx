import { SpatialHover } from './SpatialHover';
import { ContractBlock } from './ContractPills';
import { LivePreview } from './LivePreview';
import type { CatalogEntry } from '../data/catalog';

interface CatalogRowProps {
  entry: CatalogEntry;
  expanded: boolean;
  onToggle: () => void;
}

export function CatalogRow({ entry, expanded, onToggle }: CatalogRowProps) {
  return (
    <SpatialHover
      disabled={expanded}
      className={`catalog-row${expanded ? ' is-expanded' : ''}`}
      maxTilt={8}
    >
      <button
        type="button"
        className="catalog-row__head"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={`row-panel-${entry.name}`}
      >
        <span className={`catalog-row__dot catalog-row__dot--${entry.category}`} aria-hidden="true" />
        <span className="catalog-row__name">{entry.name}</span>
        <span className="catalog-row__badge">{entry.category}</span>
        <span className="catalog-row__desc">{entry.description}</span>
        <span className="catalog-row__meta" aria-hidden="true">
          {entry.parts.length}p · {entry.states.length}s
          {entry.forbidden.length > 0 && (
            <span className="catalog-row__meta--danger"> · {entry.forbidden.length} forbidden</span>
          )}
        </span>
        <span className="catalog-row__cost" aria-hidden="true">◆ {entry.spoonCost}</span>
        <span className={`catalog-row__chevron${expanded ? ' is-open' : ''}`} aria-hidden="true">▾</span>
      </button>

      <div id={`row-panel-${entry.name}`} className={`catalog-row__collapse${expanded ? ' is-open' : ''}`}>
        <div className="catalog-row__collapse-inner">
          {expanded && (
            <div className="catalog-row__panel">
              <div className="catalog-row__preview">
                <h4 className="catalog-row__panel-label">
                  <span className="catalog-row__live-dot" aria-hidden="true" />
                  Live render
                </h4>
                <div className="catalog-stage">
                  <LivePreview name={entry.name} />
                </div>
              </div>

              <div className="catalog-row__contract">
                <h4 className="catalog-row__panel-label">Semantic contract</h4>
                <div className="catalog-row__contract-grid">
                  <ContractBlock label="Semantic parts" kind="parts" items={entry.parts} />
                  <ContractBlock label="Interaction states" kind="states" items={entry.states} />
                  {entry.forbidden.length > 0 && (
                    <ContractBlock label="Forbidden patterns" kind="forbidden" items={entry.forbidden} danger />
                  )}
                  <div className="catalog-row__tokens">
                    <ContractBlock label="Design tokens mapped" kind="tokens" items={entry.tokens} />
                  </div>
                </div>
                <footer className="catalog-row__foot">
                  <code className="catalog-row__class">{entry.cssClass}</code>
                  <span className={`catalog-row__source chip-${entry.type}`}>{entry.type}</span>
                </footer>
              </div>
            </div>
          )}
        </div>
      </div>
    </SpatialHover>
  );
}