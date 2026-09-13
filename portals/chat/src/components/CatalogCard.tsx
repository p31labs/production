import { useState } from 'react';
import { SpatialHover } from './SpatialHover';
import { PreviewRenderer, hasLivePreview } from './PreviewRenderer';
import type { CatalogEntry } from '../data/catalog';

interface CatalogCardProps {
  component: CatalogEntry;
}

export function CatalogCard({ component }: CatalogCardProps) {
  const [hovered, setHovered] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('component-name', component.name);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const live = hasLivePreview(component.name);

  return (
    <SpatialHover>
      <article
        className={`catalog-card${component.type === 'contract' ? ' catalog-card--contract' : ''}${live ? ' catalog-card--live' : ''}`}
        role="listitem"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        draggable
        onDragStart={handleDragStart}
        data-category={component.category}
        data-name={component.name}
        data-type={component.type}
      >
        <div className="catalog-card__preview">
          <div className="catalog-card__stage">
            {live ? (
              <PreviewRenderer component={component} />
            ) : (
              <>
                <span className="catalog-card__tag">{component.name}</span>
                <div className="catalog-card__css-class">.{component.cssClass}</div>
                <span className="catalog-card__type-badge">{component.type}</span>
              </>
            )}
            {hovered && (
              <div className="catalog-card__hover-hint">Drag to canvas</div>
            )}
          </div>
        </div>

        <div className="catalog-card__body">
          <h3 className="catalog-card__name">{component.name}</h3>
          <p className="catalog-card__description">{component.description}</p>

          <div className="catalog-card__meta">
            <span className="catalog-card__category">{component.category}</span>
            <span className="catalog-card__spoon" title="Spoon cost to place">
              ◆ {component.spoonCost} spoon{component.spoonCost !== 1 ? 's' : ''}
            </span>
            {component.system !== 'design-core' && (
              <span className="catalog-card__system">{component.system}</span>
            )}
          </div>

          {component.states && component.states.length > 0 && (
            <div className="catalog-card__contract">
              <span className="catalog-card__contract-label">{component.states.length} states</span>
              {component.forbidden && component.forbidden.length > 0 && (
                <span className="catalog-card__contract-warning">
                  {component.forbidden.length} forbidden patterns
                </span>
              )}
            </div>
          )}

          {component.tokens.length > 0 && (
            <div className="catalog-card__tokens">
              {component.tokens.slice(0, 4).map((t) => (
                <span key={t} className="catalog-card__token">{t}</span>
              ))}
              {component.tokens.length > 4 && (
                <span className="catalog-card__token-more">+{component.tokens.length - 4}</span>
              )}
            </div>
          )}
        </div>
      </article>
    </SpatialHover>
  );
}
