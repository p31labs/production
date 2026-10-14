import type { CSSProperties } from 'react';

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: readonly TabItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/** Tabs — a roving-tabindex tablist on the canon control floor. */
export function Tabs({ items, activeId, onSelect, ariaLabel = 'Tabs', className = '', style }: TabsProps) {
  return (
    <div data-p31="tabs" role="tablist" aria-label={ariaLabel} className={className} style={style}>
      {items.map((item) => (
        <button
          key={item.id}
          data-p31="tab"
          type="button"
          role="tab"
          aria-selected={item.id === activeId}
          tabIndex={item.id === activeId ? 0 : -1}
          onClick={() => onSelect?.(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default Tabs;