import { useEffect, useRef, useState } from 'react';

/**
 * @p31ca/design-core — shell/CartridgeSwitcher.tsx
 *
 * The face-switcher: a custom trigger + menu (the prototype's pattern, NOT the
 * native canon Dropdown — the switcher carries tier badges and live names).
 * Fully keyboard-accessible: aria-expanded, Escape closes + returns focus,
 * Arrow keys move, click-outside closes. Store-agnostic: pure props.
 */

export interface CartridgeSwitcherItem {
  id: string;
  name: string;
  tier: string;
}

export interface CartridgeSwitcherProps {
  items: CartridgeSwitcherItem[];
  active: string;
  onSelect: (id: string) => void;
  /** Accessible label for the trigger (default "Switch cartridge"). */
  label?: string;
  className?: string;
}

export function CartridgeSwitcher({ items, active, onSelect, label = 'Switch cartridge', className = '' }: CartridgeSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeItem = items.find((i) => i.id === active);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      const panel = ref.current?.querySelector<HTMLDivElement>('.cartridge-switcher__menu');
      if (e.key === 'Escape') { setOpen(false); ref.current?.querySelector<HTMLButtonElement>('.cartridge-switcher__trigger')?.focus(); }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && open && panel) {
        e.preventDefault();
        const items_ = [...panel.querySelectorAll<HTMLButtonElement>('.cartridge-switcher__item')];
        const idx = items_.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (idx + 1) % items_.length : (idx - 1 + items_.length) % items_.length;
        items_[next]?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className={`cartridge-switcher ${className}`.trim()} ref={ref}>
      <button
        type="button"
        className="cartridge-switcher__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cartridge-switcher__current">{activeItem?.name ?? active}</span>
        <span className="cartridge-switcher__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="cartridge-switcher__menu" role="menu" aria-label={label}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`cartridge-switcher__item${item.id === active ? ' is-active' : ''}`}
              aria-current={item.id === active ? 'true' : undefined}
              onClick={() => { onSelect(item.id); setOpen(false); }}
            >
              <span className="cartridge-switcher__name">{item.name}</span>
              <span className="cartridge-switcher__tier" aria-hidden="true">{item.tier}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default CartridgeSwitcher;