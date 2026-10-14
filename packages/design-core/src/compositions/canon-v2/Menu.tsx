import type { CSSProperties, ReactNode } from 'react';

export interface MenuItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface MenuProps {
  items: readonly MenuItem[];
  onSelect?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
}

/** Menu — a vertical action list (role=menu / menuitem). */
export function Menu({ items, onSelect, ariaLabel, className = '', style }: MenuProps) {
  return (
    <div data-p31="menu" role="menu" aria-label={ariaLabel} className={className} style={style}>
      {items.map((item) => (
        <button
          key={item.id}
          data-p31="menu-item"
          type="button"
          role="menuitem"
          onClick={() => onSelect?.(item.id)}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default Menu;